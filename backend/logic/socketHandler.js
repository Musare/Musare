'use strict';

module.exports = (core, io) => {

	io.on('connection', socket => {
		console.log("User has connected");
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

		socket.on('/station/:id/join', (id, cb) => {
			core['/station/:id/join'](id, socket.id, result => {
				cb(result);
			});
		});

		/*socket.on('/stations/search/:query', (query, cb) => {
			core['/stations/search/:query'](query, result => {
				cb(result);
			});
		});*/

		// this lets the client socket know that they can start making request
		//socket.emit('ready', socket.request.user.logged_in);
	});
};
