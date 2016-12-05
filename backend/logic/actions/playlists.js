'use strict';

const db = require('../db');
const io = require('../io');
const cache = require('../cache');
const utils = require('../utils');
const hooks = require('./hooks');
const async = require('async');
const playlists = require('../playlists');

module.exports = {

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

			// check the cache for the playlist
			(next) => cache.hget('playlists', data._id, next),

			// if the cached version exist
			(playlist, next) => {
				if (playlist) return next({ 'status': 'failure', 'message': 'A playlist with that id already exists' });
				db.models.playlist.findOne({ _id: data._id }, next);
			},

			(playlist, next) => {
				if (playlist) return next({ 'status': 'failure', 'message': 'A playlist with that id already exists' });
				const { _id, displayName, songs, createdBy } = data;
				db.models.playlist.create({
					_id,
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
				utils.getSongFromYouTube(songId, (song) => {
					song.artists = [];
					song.genres = [];
					song.skipDuration = 0;
					song.thumbnail = 'empty';
					song.explicit = false;
					song.requestedBy = 'temp';
					song.requestedAt = Date.now();
					next(null, song);
				});
			},
			(newSong, next) => {
				utils.getSongFromSpotify(newSong, (song) => {
					next(null, song);
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

	removeSongFromPlaylist: (session, songId, playlistId, cb) => {
		db.models.playlist.findOne({ _id: playlistId }, (err, playlist) => {
			if (err) throw err;

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
			if (err) throw err;
			cache.hset('playlists', _id, res);
			return cb({ status: 'success', message: 'Playlist has been successfully updated' });
		});
	},

	updatePlaylistId: (session, oldId, newId, cb) => {
		db.models.playlist.findOne({ _id: oldId }).exec((err, doc) => {
			if (err) throw err;
			doc._id = newId;
			let newPlaylist = new db.models.playlist(doc);
			newPlaylist.isNew = true;
			newPlaylist.save(err => {
				if (err) console.error(err);
			});
			db.models.playlist.remove({ _id: oldId });
			cache.hdel('playlists', oldId, () => {
				cache.hset('playlists', newId, doc);
				return cb({ status: 'success', data: doc });
			});
		});
	},

	promoteSong: (session, playlistId, fromIndex, cb) => {
		db.models.playlist.findOne({ _id: playlistId }, (err, playlist) => {
			if (err) throw err;

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
			if (err) throw err;

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
			if (err) throw err;
			cache.hdel('playlists', _id, () => {
				return cb({ status: 'success', message: 'Playlist successfully removed' });
			});
		});
	}

};