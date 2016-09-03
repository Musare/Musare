'use strict';

module.exports = function (base, io) {

	io.on('connection', function (socket) {

		socket.on('disconnect', function () {
			base.disconnect(function () {
				console.log('User has disconnected');
			});
		});

		socket.on('login', function (user, cb) {
			base.login(user, function (result) {
				cb(result);
			});
		});

		socket.on('register', function (user, cb) {
			base.register(user, function (result) {
				cb(result);
			});
		});

		socket.on('getRooms', function () {
			base.rooms(function (result) {
				socket.emit('rooms', result);
			});
		});

		socket.on('room', function (id, cb) {//TODO Replace 'room' with a better name.
			base.room(id, function (result) {
				var info = {
					displayName: result.getDisplayName(),
					users: result.getUsers(),
					currentSong: result.getCurrentSong()
				};
				cb(info);
			});
		});

		socket.on('search', function (query) {//TODO Replace search with a better name.
			base.search(query, function (result) {
				socket.emit('search', result);
			});
		});

		socket.emit('ready');//TODO Remove this

	});
};
