'use strict';

const passport = require('passport');

module.exports = (core, io, app) => {

	io.on('connection', socket => {

		console.log("User has connected");

		let _user = socket.request.user;
		let _currentStation = "";

		socket.on('disconnect', _ => {
			core['/stations/leave/:id'](_currentStation);
			_currentStation = "";
			console.log('User has disconnected');
		});

		socket.on('/users/logout', _ => {
			app.use((req, res) => {
				req.logout();
			});
		});

		socket.on('error', err => {
			console.log(err);
		});

		socket.on('/stations/join/:id', (id, cb) => {
			core['/stations/join/:id'](id, result => {
				_currentStation = id;
				cb(result);
			});
		});

		socket.on('/stations/leave/:id', (id, cb) => {
			core['/stations/leave/:id'](id, result => {
				_currentStation = "";
				cb(result);
			});
		})

		socket.on('/youtube/getVideo/:query', (query, cb) => {
			core['/youtube/getVideo/:query'](query, result => {
				cb(JSON.parse(result));
			});
		});

		socket.on('/stations/add/:song', (station, song, cb) => {
			core['/stations/add/:song'](station, song, _user, result => {
				cb(result);
			});
		});

		socket.on('/songs', (cb) => {
			core['/songs'](result => {
				cb(result);
			});
		});

		socket.on('/stations', (cb) => {
			core['/stations'](result => {
				cb(result);
			});
		});

		socket.on('/songs/:song/update', (song, cb) => {
			core['/songs/:song/update'](song, result => {
				cb(result);
			});
		});

		socket.on('/songs/:song/remove', (song, cb) => {
			core['/songs/:song/remove'](song, result => {
				cb(result);
			});
		});

		// this lets the client socket know that they can start making request
		console.log(socket.request.user);

		socket.emit('ready', socket.request.user.logged_in);
	});
};
