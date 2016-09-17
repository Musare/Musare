'use strict';

module.exports = (core, io) => {

	// tell all the users in this room that someone is joining it
	core.on('station-joined', user => {
		io.sockets.clients().forEach(socket => {
			if (socket.request.user.id != user.user.id && socket.request.user.roomId === id) {
				socket.emit('station-joined', user);
			}
		});
	});

	io.on('connection', socket => {
		console.log("CONNECTED!");
		socket.on('disconnect', () => {
			console.log('User has disconnected');
		});

		socket.on('/users/register', (username, email, password, recaptcha, cb) => {
			core['/users/register'](result => {
				cb(result);
			});
		});

		socket.on('/stations', cb => {
			core['/stations'](result => {
				cb(result);
			});
		});

		socket.on('/stations/join/:id', (id, cb) => {
			core['/stations/join/:id'](id, result => {
				cb(result);
			});
		});

		socket.on('/stations/search/:query', (query, cb) => {
			core['/stations/search/:query'](query, result => {
				cb(result);
			});
		});

		// this lets the client socket know that they can start making request
		socket.emit('ready', socket.request.user.logged_in);
	});
};
