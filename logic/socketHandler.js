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

		socket.on('rooms', function () {
			base.rooms(function (result) {
				socket.emit('rooms', result);
			});
		});

		socket.on('room', function (id) {
			base.room(id, function (result) {
				socket.emit('room', result);
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
