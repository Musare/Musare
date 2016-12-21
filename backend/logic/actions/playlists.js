'use strict';

const db = require('../db');
const io = require('../io');
const cache = require('../cache');
const utils = require('../utils');
const hooks = require('./hooks');
const async = require('async');
const playlists = require('../playlists');
const songs = require('../songs');

cache.sub('playlist.create', playlistId => {
	playlists.getPlaylist(playlistId, (err, playlist) => {
		if (!err) {
			utils.socketsFromUser(playlist.createdBy, (sockets) => {
				sockets.forEach((socket) => {
					socket.emit('event:playlist.create', playlist);
				});
			});
		}
	});
});

cache.sub('playlist.delete', res => {
	utils.socketsFromUser(res.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:playlist.delete', res.playlistId);
		});
	});
});

cache.sub('playlist.moveSongToTop', res => {
	utils.socketsFromUser(res.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:playlist.moveSongToTop', {playlistId: res.playlistId, songId: res.songId});
		});
	});
});

cache.sub('playlist.moveSongToBottom', res => {
	utils.socketsFromUser(res.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:playlist.moveSongToBottom', {playlistId: res.playlistId, songId: res.songId});
		});
	});
});

cache.sub('playlist.addSong', res => {
	utils.socketsFromUser(res.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:playlist.addSong', {playlistId: res.playlistId, song: res.song});
		});
	});
});

cache.sub('playlist.removeSong', res => {
	utils.socketsFromUser(res.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:playlist.removeSong', {playlistId: res.playlistId, songId: res.songId});
		});
	});
});

cache.sub('playlist.updateDisplayName', res => {
	utils.socketsFromUser(res.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:playlist.updateDisplayName', {playlistId: res.playlistId, displayName: res.displayName});
		});
	});
});

let lib = {

	getFirstSong: hooks.loginRequired((session, playlistId, cb, userId) => {
		playlists.getPlaylist(playlistId, (err, playlist) => {
			if (err || !playlist || playlist.createdBy !== userId) return cb({ status: 'failure', message: 'Something went wrong when getting the playlist'});
			cb({
				status: 'success',
				song: playlist.songs[0]
			});
		});
	}),

	indexForUser: hooks.loginRequired((session, cb, userId) => {
		db.models.playlist.find({ createdBy: userId }, (err, playlists) => {
			if (err) return cb({ status: 'failure', message: 'Something went wrong when getting the playlists'});;
			cb({
				status: 'success',
				data: playlists
			});
		});
	}),

	create: hooks.loginRequired((session, data, cb, userId) => {
		async.waterfall([

			(next) => {
				return (data) ? next() : cb({ 'status': 'failure', 'message': 'Invalid data' });
			},

			(next) => {
				const { name, displayName, songs } = data;
				db.models.playlist.create({
					_id: utils.generateRandomString(17),//TODO Check if exists
					displayName,
					songs,
					createdBy: userId,
					createdAt: Date.now()
				}, next);
			}

		], (err, playlist) => {
			console.log(err, playlist);
			if (err) return cb({ 'status': 'failure', 'message': 'Something went wrong'});
			cache.pub('playlist.create', playlist._id);
			return cb({ 'status': 'success', 'message': 'Successfully created playlist' });
		});
	}),

	getPlaylist: hooks.loginRequired((session, id, cb, userId) => {
		playlists.getPlaylist(id, (err, playlist) => {
			if (err || playlist.createdBy !== userId) return cb({status: 'success', message: 'Playlist not found'});
			if (err == null) return cb({
				status: 'success',
				data: playlist
			});
		});
	}),

	//TODO Remove this
	update: hooks.loginRequired((session, _id, playlist, cb, userId) => {
		db.models.playlist.update({ _id, createdBy: userId }, playlist, (err, data) => {
			if (err) return cb({ status: 'failure', message: 'Something went wrong.' });
			playlists.updatePlaylist(_id, (err) => {
				if (err) return cb({ status: 'failure', message: 'Something went wrong.' });
				return cb({ status: 'success', message: 'Playlist has been successfully updated', data });
			});
		});
	}),

	addSongToPlaylist: hooks.loginRequired((session, songId, playlistId, cb, userId) => {
		console.log(songId);
		async.waterfall([
			(next) => {
				playlists.getPlaylist(playlistId, (err, playlist) => {
					if (err || !playlist || playlist.createdBy !== userId) return next('Something went wrong when trying to get the playlist');

					let found = false;
					playlist.songs.forEach((song) => {
						if (songId === song._id) found = true;
					});
					if (found) return next('That song is already in the playlist');
					return next(null);
				});
			},
			(next) => {
				songs.getSong(songId, (err, song) => {
					if (err) {
						utils.getSongFromYouTube(songId, (song) => {
							next(null, song);
						});
					} else {
						next(null, {
							_id: songId,
							title: song.title,
							duration: song.duration
						});
					}
				});
			},
			(newSong, next) => {
				db.models.playlist.update({ _id: playlistId }, { $push: { songs: newSong } }, (err) => {
					if (err) {
						console.error(err);
						return next('Failed to add song to playlist');
					}

					playlists.updatePlaylist(playlistId, (err, playlist) => {
						next(err, playlist, newSong);
					});
				});
			}
		],
		(err, playlist, newSong) => {
			if (err) return cb({ status: 'error', message: err });
			else if (playlist.songs) {
				cache.pub('playlist.addSong', { playlistId: playlist._id, song: newSong, userId: userId });
				return cb({ status: 'success', message: 'Song has been successfully added to the playlist', data: playlist.songs });
			}
		});
	}),
	
	addSetToPlaylist: hooks.loginRequired((session, url, playlistId, cb, userId) => {
		async.waterfall([
			(next) => {
				utils.getPlaylistFromYouTube(url, songs => {
					next(null, songs);
				});
			},
			(songs, next) => {
				let processed = 0;
				function checkDone() {
					if (processed === songs.length) next();
				}
				for (let s = 0; s < songs.length; s++) {
					lib.addSongToPlaylist(session, songs[s].contentDetails.videoId, playlistId, () => {
						processed++;
						checkDone();
					});
				}
			},
			(next) => {
				playlists.getPlaylist(playlistId, (err, playlist) => {
					if (err || !playlist || playlist.createdBy !== userId) return next('Something went wrong while trying to get the playlist');

					next(null, playlist);
				});
			}
		],
		(err, playlist) => {
			if (err) return cb({ status: 'failure', message: err });
			else if (playlist.songs) return cb({ status: 'success', message: 'Playlist has been successfully imported.', data: playlist.songs });
		});
	}),


	removeSongFromPlaylist: hooks.loginRequired((session, songId, playlistId, cb, userId) => {
		playlists.getPlaylist(playlistId, (err, playlist) => {
			if (err || !playlist || playlist.createdBy !== userId) return cb({ status: 'failure', message: 'Something went wrong when getting the playlist'});

			for (let z = 0; z < playlist.songs.length; z++) {
				if (playlist.songs[z]._id == songId) playlist.songs.shift(playlist.songs[z]);
			}

			db.models.playlist.update({_id: playlistId}, {$pull: {songs: {_id: songId}}}, (err) => {
				if (err) {
					console.error(err);
					return cb({ status: 'failure', message: 'Something went wrong when saving the playlist.'});
				}
				playlists.updatePlaylist(playlistId, (err, playlist) => {
					cache.pub('playlist.removeSong', {playlistId: playlist._id, songId: songId, userId: userId});
					return cb({ status: 'success', message: 'Song has been successfully removed from playlist', data: playlist.songs });
				});
			});
		});
	}),

	updateDisplayName: hooks.loginRequired((session, _id, displayName, cb, userId) => {
		db.models.playlist.update({ _id, createdBy: userId }, { displayName }, (err, res) => {
			if (err) return cb({ status: 'failure', message: 'Something went wrong when saving the playlist.'});
			playlists.updatePlaylist(_id, (err) => {
				if (err) return cb({ status: 'failure', message: err});
				cache.pub('playlist.updateDisplayName', {playlistId: _id, displayName: displayName, userId: userId});
				return cb({ status: 'success', message: 'Playlist has been successfully updated' });
			})
		});
	}),

	moveSongToTop: hooks.loginRequired((session, playlistId, songId, cb, userId) => {
		playlists.getPlaylist(playlistId, (err, playlist) => {
			if (err || !playlist || playlist.createdBy !== userId) return cb({ status: 'failure', message: 'Something went wrong when getting the playlist'});
			let found = false;
			let foundSong;
			playlist.songs.forEach((song) => {
				if (song._id === songId) {
					foundSong = song;
					found = true;
				}
			});

			if (found) {
				db.models.playlist.update({_id: playlistId}, {$pull: {songs: {_id: songId}}}, (err) => {
					console.log(err);
					if (err) return cb({status: 'failure', message: 'Something went wrong when moving the song'});
					db.models.playlist.update({_id: playlistId}, {
						$push: {
							songs: {
								$each: [foundSong],
								$position: 0
							}
						}
					}, (err) => {
						console.log(err);
						if (err) return cb({status: 'failure', message: 'Something went wrong when moving the song'});
						playlists.updatePlaylist(playlistId, (err) => {
							if (err) return cb({ status: 'failure', message: err});
							cache.pub('playlist.moveSongToTop', {playlistId, songId, userId: userId});
							return cb({ status: 'success', message: 'Playlist has been successfully updated' });
						})
					});
				});
			} else {
				return cb({status: 'failure', message: 'Song not found.'});
			}
		});
	}),

	moveSongToBottom: hooks.loginRequired((session, playlistId, songId, cb, userId) => {
		playlists.getPlaylist(playlistId, (err, playlist) => {
			if (err || !playlist || playlist.createdBy !== userId) return cb({ status: 'failure', message: 'Something went wrong when getting the playlist'});
			let found = false;
			let foundSong;
			playlist.songs.forEach((song) => {
				if (song._id === songId) {
					foundSong = song;
					found = true;
				}
			});

			if (found) {
				db.models.playlist.update({_id: playlistId}, {$pull: {songs: {_id: songId}}}, (err) => {
					console.log(err);
					if (err) return cb({status: 'failure', message: 'Something went wrong when moving the song'});
					db.models.playlist.update({_id: playlistId}, {
						$push: { songs: foundSong }
					}, (err) => {
						console.log(err);
						if (err) return cb({status: 'failure', message: 'Something went wrong when moving the song'});
						playlists.updatePlaylist(playlistId, (err) => {
							if (err) return cb({ status: 'failure', message: err });
							cache.pub('playlist.moveSongToBottom', { playlistId, songId, userId: userId });
							return cb({ status: 'success', message: 'Playlist has been successfully updated' });
						})
					});
				});
			} else return cb({status: 'failure', message: 'Song not found'});
		});
	}),

	/*

	promoteSong: hooks.loginRequired((session, playlistId, fromIndex, cb, userId) => {
		db.models.playlist.findOne({ _id: playlistId }, (err, playlist) => {
			if (err || !playlist || playlist.createdBy !== userId) return cb({ status: 'failure', message: 'Something went wrong when getting the playlist.'});

			let song = playlist.songs[fromIndex];
			playlist.songs.splice(fromIndex, 1);
			playlist.songs.splice((fromIndex + 1), 0, song);

			playlist.save(err => {
				if (err) {
					console.error(err);
					return cb({ status: 'failure', message: 'Something went wrong when saving the playlist.'});
				}

				playlists.updatePlaylist(playlistId, (err) => {
					if (err) return cb({ status: 'failure', message: 'Something went wrong when saving the playlist.'});
					return cb({ status: 'success', data: playlist.songs });
				});

			});
		});
	}),

	demoteSong: hooks.loginRequired((session, playlistId, fromIndex, cb, userId) => {
		db.models.playlist.findOne({ _id: playlistId }, (err, playlist) => {
			if (err || !playlist || playlist.createdBy !== userId) return cb({ status: 'failure', message: 'Something went wrong when getting the playlist.'});

			let song = playlist.songs[fromIndex];
			playlist.songs.splice(fromIndex, 1);
			playlist.songs.splice((fromIndex - 1), 0, song);

			playlist.save(err => {
				if (err) {
					console.error(err);
					return cb({ status: 'failure', message: 'Something went wrong when saving the playlist.'});
				}

				playlists.updatePlaylist(playlistId, (err) => {
					if (err) return cb({ status: 'failure', message: 'Something went wrong when saving the playlist.'});
					return cb({ status: 'success', data: playlist.songs });
				});

			});
		});
	}),*/

	remove: hooks.loginRequired((session, _id, cb, userId) => {
		console.log(_id, userId);
		db.models.playlist.remove({ _id, createdBy: userId }).exec(err => {
			if (err) return cb({ status: 'failure', message: 'Something went wrong when removing the playlist.'});
			cache.hdel('playlists', _id, () => {
				cache.pub('playlist.delete', {userId: userId, playlistId: _id});
				return cb({ status: 'success', message: 'Playlist successfully removed' });
			});
		});
	})

};

module.exports = lib;