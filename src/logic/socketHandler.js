'use strict';

module.exports = function (core, io) {

	// tell all the users in this room that someone is joining it
	core.on('station-joined', function (user) {
		io.sockets.clients().forEach(function (socket) {
			if (socket.request.user.id != user.user.id && socket.request.user.roomId === id) {
				socket.emit('station-joined', user);
			}
		});
	});

	io.on('connection', function (socket) {

		socket.on('disconnect', function () {
			console.log('User has disconnected');
		});

		socket.on('/users/login', function (user, cb) {
			core['/users/login'](user, function (result) {
				cb(result);
			});
		});

		socket.on('/users/register', function (user, cb) {
			core['/users/register'](user, function (result) {
				cb(result);
			});
		});

		socket.on('/stations', function (cb) {
			core['/stations'](function (result) {
				cb(result);
			});
		});

		socket.on('/stations/join/:id', function (id, cb) {
			core['/stations/join/:id'](id, function (result) {
				cb(result);
			});
		});

		socket.on('/stations/search/:query', function (query, cb) {
			core['/stations/search/:query'](query, function (result) {
				cb(result);
			});
		});

		// this lets the client socket know that they can start making request
		socket.emit('ready');
	});
};
