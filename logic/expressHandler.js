'use strict';

module.exports = function (core, app) {

	app.post('/login', function (user) {
		core.login(user, function (result) {
			res.send(JSON.stringify(result));
		});
	});

	app.post('/register', function (user) {
		core.register(user, function (result) {
			res.send(JSON.stringify(result));
		});
	});

	app.get('/rooms', function () {
		core.rooms(function (result) {
			res.send(JSON.stringify(result));
		});
	});

	app.get('/search/:query', function () {//TODO Replace search with a better name.
		core.search(query, function (result) {
			res.send(JSON.stringify(result));
		});
	});
};
