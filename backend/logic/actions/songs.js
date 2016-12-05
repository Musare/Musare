'use strict';

const db = require('../db');
const io = require('../io');
const songs = require('../songs');
const cache = require('../cache');
const utils = require('../utils');
const hooks = require('./hooks');
const queueSongs = require('./queueSongs');

cache.sub('song.like', (data) => {
	io.io.to(`song.${data.songId}`).emit('event:song.like', {songId: data.songId, undisliked: data.undisliked});
	utils.socketsFromUser(data.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:song.newRatings', {songId: data.songId, liked: true, disliked: false});
		});
	});
});

cache.sub('song.dislike', (data) => {
	io.io.to(`song.${data.songId}`).emit('event:song.dislike', {songId: data.songId, unliked: data.unliked});
	utils.socketsFromUser(data.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:song.newRatings', {songId: data.songId, liked: false, disliked: true});
		});
	});
});

cache.sub('song.unlike', (data) => {
	io.io.to(`song.${data.songId}`).emit('event:song.unlike', {songId: data.songId});
	utils.socketsFromUser(data.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:song.newRatings', {songId: data.songId, liked: false, disliked: false});
		});
	});
});

cache.sub('song.undislike', (data) => {
	io.io.to(`song.${data.songId}`).emit('event:song.undislike', {songId: data.songId});
	utils.socketsFromUser(data.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:song.newRatings', {songId: data.songId, liked: false, disliked: false});
		});
	});
});

module.exports = {

	index: (session, cb) => {
		db.models.song.find({}, (err, songs) => {
			if (err) throw err;
			cb(songs);
		});
	},

	update: hooks.adminRequired((session, songId, song, cb) => {
		db.models.song.findOneAndUpdate({ _id: songId }, song, { upsert: true }, (err, updatedSong) => {
			if (err) throw err;
			return cb({ status: 'success', message: 'Song has been successfully updated', data: updatedSong });
		});
	}),

	remove: hooks.adminRequired((session, songId, cb) => {
		db.models.song.remove({ _id: songId });
	}),

	add: hooks.adminRequired((session, song, cb, userId) => {
		queueSongs.remove(session, song._id, () => {
			const newSong = new db.models.song(song);
			db.models.song.findOne({ _id: song._id }, (err, existingSong) => {
				if (err) throw err;
				newSong.acceptedBy = userId;
				newSong.acceptedAt = Date.now();
				if (!existingSong) newSong.save(err => {
					console.log(err, 1);
					if (err) throw err;
					else cb({ status: 'success', message: 'Song has been moved from Queue' })
				});
			});
			//TODO Check if video is in queue and Add the song to the appropriate stations
		});
	}),

	like: hooks.loginRequired((session, songId, cb, userId) => {
		db.models.user.findOne({ _id: userId }, (err, user) => {
			if (user.liked.indexOf(songId) !== -1) return cb({ status: 'failure', message: 'You have already liked this song.' });
			let dislikes = 0;
			if (user.disliked.indexOf(songId) !== -1) dislikes = -1;
			db.models.song.update({ _id: songId }, { $inc: { likes: 1, dislikes: dislikes } }, err => {
				if (!err) {
					db.models.user.update({_id: userId}, {$push: {liked: songId}, $pull: {disliked: songId}}, err => {
						if (!err) {
							console.log(JSON.stringify({ songId, userId: userId }));
							songs.updateSong(songId, (err, song) => {});
							cache.pub('song.like', JSON.stringify({ songId, userId: session.userId, undisliked: (dislikes === -1) }));
						} else db.models.song.update({ _id: songId }, { $inc: { likes: -1, dislikes: -dislikes } }, err => {
							return cb({ status: 'failure', message: 'Something went wrong while liking this song.' });
						});
					});
				} else {
					return cb({ status: 'failure', message: 'Something went wrong while liking this song.' });
				}
			});
		});
	}),

	dislike: hooks.loginRequired((session, songId, cb, userId) => {
		db.models.user.findOne({_id: userId}, (err, user) => {
			if (user.disliked.indexOf(songId) !== -1) return cb({ status: 'failure', message: 'You have already disliked this song.' });
			let likes = 0;
			if (user.liked.indexOf(songId) !== -1) likes = -1;
			db.models.song.update({_id: songId}, {$inc: {likes: likes, dislikes: 1}}, (err) => {
				if (!err) {
					db.models.user.update({_id: userId}, {$push: {disliked: songId}, $pull: {liked: songId}}, (err) => {
						if (!err) {
							songs.updateSong(songId, (err, song) => {});
							cache.pub('song.dislike', JSON.stringify({songId, userId: userId, unliked: (likes === -1)}));
						} else db.models.song.update({_id: songId}, {$inc: {likes: -likes, dislikes: -1}}, (err) => {
							return cb({ status: 'failure', message: 'Something went wrong while disliking this song.' });
						});
					});
				} else {
					return cb({ status: 'failure', message: 'Something went wrong while disliking this song.' });
				}
			});
		});
	}),

	undislike: hooks.loginRequired((session, songId, cb, userId) => {
		db.models.user.findOne({_id: userId}, (err, user) => {
			if (user.disliked.indexOf(songId) === -1) return cb({ status: 'failure', message: 'You have not disliked this song.' });
			db.models.song.update({_id: songId}, {$inc: {dislikes: -1}}, (err) => {
				if (!err) {
					db.models.user.update({_id: userId}, {$pull: {disliked: songId}}, (err) => {
						if (!err) {
							songs.updateSong(songId, (err, song) => {});
							cache.pub('song.undislike', JSON.stringify({songId, userId: userId}));
						} else db.models.song.update({_id: songId}, {$inc: {dislikes: 1}}, (err) => {
							return cb({ status: 'failure', message: 'Something went wrong while undisliking this song.' });
						});
					});
				} else {
					return cb({ status: 'failure', message: 'Something went wrong while undisliking this song.' });
				}
			});
		});
	}),

	unlike: hooks.loginRequired((session, songId, cb, userId) => {
		db.models.user.findOne({_id: userId}, (err, user) => {
			if (user.liked.indexOf(songId) === -1) return cb({ status: 'failure', message: 'You have not liked this song.' });
			db.models.song.update({_id: songId}, {$inc: {likes: -1}}, (err) => {
				if (!err) {
					db.models.user.update({_id: userId}, {$pull: {liked: songId}}, (err) => {
						if (!err) {
							songs.updateSong(songId, (err, song) => {});
							cache.pub('song.unlike', JSON.stringify({songId, userId: userId}));
						} else db.models.song.update({_id: songId}, {$inc: {likes: 1}}, (err) => {
							return cb({ status: 'failure', message: 'Something went wrong while unliking this song.' });
						});
					});
				} else {
					return cb({ status: 'failure', message: 'Something went wrong while unliking this song.' });
				}
			});
		});
	}),

	getOwnSongRatings: hooks.loginRequired(function(session, songId, cb, userId) {
		db.models.user.findOne({_id: userId}, (err, user) => {
			return cb({
				status: 'success',
				songId: songId,
				liked: (user.liked.indexOf(songId) !== -1),
				disliked: (user.disliked.indexOf(songId) !== -1)
			});
		});
	})

};