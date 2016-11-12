'use strict';

const passport = require('passport');

module.exports = (core, io) => {

	io.on('connection', socket => {

		console.log("socketHandler: User has connected");

		let session = "socket.request.user";

		socket.on('disconnect', _ => {
			core['/stations/leave'](session, result => {});
			console.log('socketHandler: User has disconnected');
		});

		socket.on('error', err => console.log(err));

		socket.on('/users/logout', (cb) => core['/users/logout'](socket.request, result => cb(result)));

		socket.on('/u/:username', (cb) => core['/users/logout'](socket.request, result => cb(result)));

		socket.on('/stations', (cb) => core['/stations'](session, result => cb(result)));
		socket.on('/stations/join/:id', (id, cb) => core['/stations/join/:id'](session, id, result => cb(result)));
		socket.on('/stations/leave', cb => core['/stations/leave'](session, result => cb(result)));
		socket.on('/stations/add/:song', (station, song, cb) => core['/stations/add/:song'](session, station, song, result => cb(result)));

		socket.on('/songs', (cb) => core['/songs'](session, result => cb(result)));
		socket.on('/songs/:song/update', (song, cb) => core['/songs/:song/update'](session, song, result => cb(result)));
		socket.on('/songs/:song/remove', (song, cb) => core['/songs/:song/remove'](session, song, result => cb(result)));

		socket.on('/youtube/getVideo/:query', (query, cb) => core['/youtube/getVideo/:query'](session, query, result => cb(result)));

		// this lets the client socket know that they can start making request
		socket.emit('ready', false); // socket.request.user.logged_in
	});
};
