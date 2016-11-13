'use strict';

const passport = require('passport');

module.exports = (core, io) => {

	io.on('connection', socket => {

		console.log("socketHandler: User has connected");

		// let session = socket.request.user;

		socket.on('disconnect', _ => {
			core['/stations/leave'](result => {});
			console.log('socketHandler: User has disconnected');
		});

		socket.on('error', err => console.log(err));

		socket.on('/u/:username', (username, cb) => core['/u/:username'](username, result => cb(result)));

		socket.on('/stations', (cb) => core['/stations'](result => cb(result)));
		socket.on('/stations/join/:id', (id, cb) => core['/stations/join/:id'](id, result => cb(result)));
		socket.on('/stations/leave', cb => core['/stations/leave'](result => cb(result)));
		socket.on('/stations/add/:song', (station, song, cb) => core['/stations/add/:song'](station, song, result => cb(result)));

		socket.on('/songs', (cb) => core['/songs'](result => cb(result)));
		socket.on('/songs/:song/update', (song, cb) => core['/songs/:song/update'](song, result => cb(result)));
		socket.on('/songs/:song/remove', (song, cb) => core['/songs/:song/remove'](song, result => cb(result)));

		socket.on('/youtube/getVideo/:query', (query, cb) => core['/youtube/getVideo/:query'](query, result => cb(result)));

		// this lets the client socket know that they can start making request
		socket.emit('ready', false); // socket.request.user.logged_in
	});
};
