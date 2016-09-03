'use strict';

module.exports = function (base, io) {

	io.on('connection', function (socket) {

		socket.on('disconnect', function () {
			base.disconnect(function () {
				console.log('User has disconnected');
			});
		});

		socket.on('login', function (user) {
			base.login(user, function (result) {
				socket.emit('login', result);
			});
		});

		socket.on('register', function (user) {
			base.register(user, function (result) {
				socket.emit('register', result);
			});
		});

		socket.on('getRooms', function () {
			base.rooms(function (result) {
				var rooms = result.map(function(result) {
					return {
						id: result.getId(),
						displayName: result.getDisplayName(),
						description: result.getDescription(),
						users: result.getUsers()
					}
				});
				socket.emit('rooms', result);
			});
		});

		socket.on('room', function (id, cb) {
			base.room(id, function (result) {
				var info = {
					displayName: result.getDisplayName(),
					users: result.getUsers(),
					currentSong: result.getCurrentSong()
				};
				cb(info);
			});
		});

		socket.on('search', function (query) {
			base.search(query, function (result) {
				socket.emit('search', result);
			});
		});

		socket.emit('ready');

	});
};
