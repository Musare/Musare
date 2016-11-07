'use strict';

module.exports = (core, io) => {

	io.on('connection', socket => {
		console.log("User has connected");
		let _user = socket.request.user;
		let _currentStation = "";

		socket.on('disconnect', () => {
			core['/stations/leave/:id'](_currentStation);
			_currentStation = "";
			console.log('User has disconnected');
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
		});

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

		socket.on('/songs/queue/getSongs', (cb) => {
			core['/songs/queue/getSongs'](_user, result => {
				cb(result);
			});
		});

		socket.on('/songs/queue/updateSong/:id', (id, object, cb) => {
			core['/songs/queue/updateSong/:id'](_user, id, object, result => {
				cb(result);
			});
		});

		// this lets the client socket know that they can start making request
		socket.emit('ready', socket.request.user.logged_in);
	});
};
