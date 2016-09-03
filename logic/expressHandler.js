'use strict';

module.exports = function (base, io) {//TODO Rename base to core

	app.post('/login', function (user) {
		base.login(user, function (result) {
			res.send(JSON.stringify(result));
		});
	});

	app.post('/register', function (user) {
		base.register(user, function (result) {
			res.send(JSON.stringify(result));
		});
	});

	app.get('/rooms', function () {
		base.rooms(function (result) {
			res.send(JSON.stringify(result));
		});
	});

	app.get('/search/:query', function () {//TODO Replace search with a better name.
		base.search(query, function (result) {
			res.send(JSON.stringify(result));
		});
	});
};
