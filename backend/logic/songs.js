'use strict';

const coreClass = require("../core");

const async = require('async');
const mongoose = require('mongoose');




module.exports = class extends coreClass {
	constructor(name, moduleManager) {
		super(name, moduleManager);

		this.dependsOn = ["utils", "cache", "db"];
	}

	initialize() {
		return new Promise((resolve, reject) => {
			this.setStage(1);

			this.cache = this.moduleManager.modules["cache"];
			this.db = this.moduleManager.modules["db"];
			this.io = this.moduleManager.modules["io"];
			this.utils = this.moduleManager.modules["utils"];

			async.waterfall([
				(next) => {
					this.setStage(2);
					this.cache.hgetall('songs', next);
				},
	
				(songs, next) => {
					this.setStage(3);
					if (!songs) return next();
					let songIds = Object.keys(songs);
					async.each(songIds, (songId, next) => {
						this.db.models.song.findOne({songId}, (err, song) => {
							if (err) next(err);
							else if (!song) this.cache.hdel('songs', songId, next);
							else next();
						});
					}, next);
				},
	
				(next) => {
					this.setStage(4);
					this.db.models.song.find({}, next);
				},
	
				(songs, next) => {
					this.setStage(5);
					async.each(songs, (song, next) => {
						this.cache.hset('songs', song.songId, this.cache.schemas.song(song), next);
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
	 * Gets a song by id from the cache or Mongo, and if it isn't in the cache yet, adds it the cache
	 *
	 * @param {String} id - the id of the song we are trying to get
	 * @param {Function} cb - gets called once we're done initializing
	 */
	async getSong(id, cb) {
		try { await this._validateHook(); } catch { return; }

		async.waterfall([
			(next) => {
				if (!mongoose.Types.ObjectId.isValid(id)) return next('Id is not a valid ObjectId.');
				this.cache.hget('songs', id, next);
			},

			(song, next) => {
				if (song) return next(true, song);
				this.db.models.song.findOne({_id: id}, next);
			},

			(song, next) => {
				if (song) {
					this.cache.hset('songs', id, song, next);
				} else next('Song not found.');
			},

		], (err, song) => {
			if (err && err !== true) return cb(err);

			cb(null, song);
		});
	}

	/**
	 * Gets a song by song id from the cache or Mongo, and if it isn't in the cache yet, adds it the cache
	 *
	 * @param {String} songId - the mongo id of the song we are trying to get
	 * @param {Function} cb - gets called once we're done initializing
	 */
	async getSongFromId(songId, cb) {
		try { await this._validateHook(); } catch { return; }

		async.waterfall([
			(next) => {
				this.db.models.song.findOne({ songId }, next);
			}
		], (err, song) => {
			if (err && err !== true) return cb(err);
			else return cb(null, song);
		});
	}

	/**
	 * Gets a song from id from Mongo and updates the cache with it
	 *
	 * @param {String} songId - the id of the song we are trying to update
	 * @param {Function} cb - gets called when an error occurred or when the operation was successful
	 */
	async updateSong(songId, cb) {
		try { await this._validateHook(); } catch { return; }

		async.waterfall([

			(next) => {
				this.db.models.song.findOne({_id: songId}, next);
			},

			(song, next) => {
				if (!song) {
					this.cache.hdel('songs', songId);
					return next('Song not found.');
				}

				this.cache.hset('songs', songId, song, next);
			}

		], (err, song) => {
			if (err && err !== true) return cb(err);

			cb(null, song);
		});
	}

	/**
	 * Deletes song from id from Mongo and cache
	 *
	 * @param {String} songId - the id of the song we are trying to delete
	 * @param {Function} cb - gets called when an error occurred or when the operation was successful
	 */
	async deleteSong(songId, cb) {
		try { await this._validateHook(); } catch { return; }

		async.waterfall([

			(next) => {
				this.db.models.song.deleteOne({ songId }, next);
			},

			(next) => {
				this.cache.hdel('songs', songId, next);
			}

		], (err) => {
			if (err && err !== true) cb(err);

			cb(null);
		});
	}
}
