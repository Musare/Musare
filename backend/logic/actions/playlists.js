'use strict';

const db = require('../db');
const io = require('../io');
const cache = require('../cache');
const utils = require('../utils');
const hooks = require('./hooks');
const async = require('async');
const playlists = require('../playlists');
const songs = require('../songs');

let lib = {

	indexForUser: (session, createdBy, cb) => {
		db.models.playlist.find({ createdBy }, (err, playlists) => {
			if (err) throw err;
			cb({
				status: 'success',
				data: playlists
			});
		});
	},

	create: (session, data, cb) => {
		async.waterfall([

			(next) => {
				return (data) ? next() : cb({ 'status': 'failure', 'message': 'Invalid data' });
			},

			(next) => {
				const { name, displayName, songs, createdBy } = data;
				db.models.playlist.create({
					displayName,
					songs,
					createdBy,
					createdAt: Date.now()
				}, next);
			}

		], (err, playlist) => {
			if (err) return cb({ 'status': 'failure', 'message': 'Something went wrong'});
			cache.pub('playlist.create', data._id);
			return cb({ 'status': 'success', 'message': 'Successfully created playlist' });
		});
	},

	getPlaylist: (session, id, cb) => {
		playlists.getPlaylist(id, (err, playlist) => {
			if (err == null) return cb({
				status: 'success',
				data: playlist
			});
		});
	},

	update: (session, _id, playlist, cb) => {
		db.models.playlist.findOneAndUpdate({ _id }, playlist, { upsert: true }, (err, data) => {
			if (err) throw err;
			return cb({ status: 'success', message: 'Playlist has been successfully updated', data });
		});
	},

	addSongToPlaylist: (session, songId, playlistId, cb) => {
		async.waterfall([
			(next) => {
				songs.getSong(songId, (err, song) => {
					if (err) {
						utils.getSongFromYouTube(songId, (song) => {
							next(null, song);
						});
					} else {
						next(null, {_id: songId, title: song.title, duration: song.duration});
					}
				});
			},
			(newSong, next) => {
				db.models.playlist.findOne({ _id: playlistId }, (err, playlist) => {
					if (err) throw err;

					playlist.songs.push(newSong);
					playlist.save(err => {
						if (err) {
							console.error(err);
							return next('Failed to add song to playlist');
						}

						cache.hset('playlists', playlistId, playlist);
						next(null, playlist);
					});
				});
			}
		],
		(err, playlist) => {
			if (err) return cb({ status: 'error', message: err });
			else return cb({ status: 'success', message: 'Song has been successfully added to the playlist', data: playlist.songs });
		});
	},
	
	addSetToPlaylist: (session, url, playlistId, cb) => {
		async.waterfall([
			(next) => {
				utils.getPlaylistFromYouTube(url, songs => {
					next(null, songs);
				});
			},
			(songs, next) => {
				for (let s = 0; s < songs.length; s++) {
					lib.addSongToPlaylist(session, songs[s].contentDetails.videoId, playlistId, (res) => {});
				}
				next(null);
			},
			(next) => {
				db.models.playlist.findOne({ _id: playlistId }, (err, playlist) => {
					if (err) console.error(err);

					next(null, playlist);
				});
			}
		],
		(err, playlist) => {
			if (err) return cb({ status: 'error', message: err });
			else if (playlist.songs) return cb({ status: 'success', message: 'Playlist has been successfully added', data: playlist.songs });
		});
	},


	removeSongFromPlaylist: (session, songId, playlistId, cb) => {
		db.models.playlist.findOne({ _id: playlistId }, (err, playlist) => {
			if (err) console.error(err);

			for (let z = 0; z < playlist.songs.length; z++) {
				if (playlist.songs[z]._id == songId) playlist.songs.shift(playlist.songs[z]);
			}

			playlist.save(err => {
				if (err) {
					console.error(err);
					return next('Failed to remove song to playlist');
				}

				cache.hset('playlists', playlistId, playlist);
				return cb({ status: 'success', message: 'Song has been successfully removed from playlist', data: playlist.songs });
			});
		});
	},

	updateDisplayName: (session, _id, displayName, cb) => {
		db.models.playlist.findOneAndUpdate({ _id }, { displayName }, { upsert: true }, (err, res) => {
			if (err) console.error(err);
			cache.hset('playlists', _id, res);
			return cb({ status: 'success', message: 'Playlist has been successfully updated' });
		});
	},

	promoteSong: (session, playlistId, fromIndex, cb) => {
		db.models.playlist.findOne({ _id: playlistId }, (err, playlist) => {
			if (err) console.error(err);

			let song = playlist.songs[fromIndex];
			playlist.songs.splice(fromIndex, 1);
			playlist.songs.splice((fromIndex + 1), 0, song);

			playlist.save(err => {
				if (err) {
					console.error(err);
					return next('Failed to promote song');
				}

				cache.hset('playlists', playlistId, playlist);
				return cb({ status: 'success', data: playlist.songs });
			});
		});
	},

	demoteSong: (session, playlistId, fromIndex, cb) => {
		db.models.playlist.findOne({ _id: playlistId }, (err, playlist) => {
			if (err) console.error(err);

			let song = playlist.songs[fromIndex];
			playlist.songs.splice(fromIndex, 1);
			playlist.songs.splice((fromIndex - 1), 0, song);

			playlist.save(err => {
				if (err) {
					console.error(err);
					return next('Failed to demote song');
				}

				cache.hset('playlists', playlistId, playlist);
				return cb({ status: 'success', data: playlist.songs });
			});
		});
	},

	remove: (session, _id, cb) => {
		db.models.playlist.remove({ _id }).exec(err => {
			if (err) console.error(err);
			cache.hdel('playlists', _id, () => {
				return cb({ status: 'success', message: 'Playlist successfully removed' });
			});
		});
	}

};

module.exports = lib;