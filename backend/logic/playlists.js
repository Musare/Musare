'use strict';

const coreClass = require("../core");

const async = require('async');

module.exports = class extends coreClass {
	constructor(name, moduleManager) {
		super(name, moduleManager);

		this.dependsOn = ["cache", "db", "utils"];
	}

	initialize() {
		return new Promise((resolve, reject) => {
			this.setStage(1);

			this.cache = this.moduleManager.modules["cache"];
			this.db	= this.moduleManager.modules["db"];
			this.utils	= this.moduleManager.modules["utils"];

			async.waterfall([
				(next) => {
					this.setStage(2);
					this.cache.hgetall('playlists', next);
				},
	
				(playlists, next) => {
					this.setStage(3);
					if (!playlists) return next();
					let playlistIds = Object.keys(playlists);
					async.each(playlistIds, (playlistId, next) => {
						this.db.models.playlist.findOne({_id: playlistId}, (err, playlist) => {
							if (err) next(err);
							else if (!playlist) {
								this.cache.hdel('playlists', playlistId, next);
							}
							else next();
						});
					}, next);
				},
	
				(next) => {
					this.setStage(4);
					this.db.models.playlist.find({}, next);
				},
	
				(playlists, next) => {
					this.setStage(5);
					async.each(playlists, (playlist, next) => {
						this.cache.hset('playlists', playlist._id, this.cache.schemas.playlist(playlist), next);
					}, next);
				}
			], async (err) => {
				if (err) {
					err = await this.utils.getError(err);
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * Gets a playlist by id from the cache or Mongo, and if it isn't in the cache yet, adds it the cache
	 *
	 * @param {String} playlistId - the id of the playlist we are trying to get
	 * @param {Function} cb - gets called once we're done initializing
	 */
	async getPlaylist(playlistId, cb) {
		try { await this._validateHook(); } catch { return; }

		async.waterfall([
			(next) => {
				this.cache.hgetall('playlists', next);
			},

			(playlists, next) => {
				if (!playlists) return next();
				let playlistIds = Object.keys(playlists);
				async.each(playlistIds, (playlistId, next) => {
					this.db.models.playlist.findOne({_id: playlistId}, (err, playlist) => {
						if (err) next(err);
						else if (!playlist) {
							this.cache.hdel('playlists', playlistId, next);
						}
						else next();
					});
				}, next);
			},

			(next) => {
				this.cache.hget('playlists', playlistId, next);
			},

			(playlist, next) => {
				if (playlist) return next(true, playlist);
				this.db.models.playlist.findOne({ _id: playlistId }, next);
			},

			(playlist, next) => {
				if (playlist) {
					this.cache.hset('playlists', playlistId, playlist, next);
				} else next('Playlist not found');
			},

		], (err, playlist) => {
			if (err && err !== true) return cb(err);
			else cb(null, playlist);
		});
	}

	/**
	 * Gets a playlist from id from Mongo and updates the cache with it
	 *
	 * @param {String} playlistId - the id of the playlist we are trying to update
	 * @param {Function} cb - gets called when an error occurred or when the operation was successful
	 */
	async updatePlaylist(playlistId, cb) {
		try { await this._validateHook(); } catch { return; }

		async.waterfall([
			(next) => {
				this.db.models.playlist.findOne({ _id: playlistId }, next);
			},

			(playlist, next) => {
				if (!playlist) {
					this.cache.hdel('playlists', playlistId);
					return next('Playlist not found');
				}
				this.cache.hset('playlists', playlistId, playlist, next);
			}

		], (err, playlist) => {
			if (err && err !== true) return cb(err);
			cb(null, playlist);
		});
	}

	/**
	 * Deletes playlist from id from Mongo and cache
	 *
	 * @param {String} playlistId - the id of the playlist we are trying to delete
	 * @param {Function} cb - gets called when an error occurred or when the operation was successful
	 */
	async deletePlaylist(playlistId, cb) {
		try { await this._validateHook(); } catch { return; }

		async.waterfall([

			(next) => {
				this.db.models.playlist.deleteOne({ _id: playlistId }, next);
			},

			(res, next) => {
				this.cache.hdel('playlists', playlistId, next);
			}

		], (err) => {
			if (err && err !== true) return cb(err);

			cb(null);
		});
	}
}
