'use strict';

module.exports = function (base, io) {

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

	app.get('/room/:id', function (id) {
		base.room(id, function (result) {
			res.send(JSON.stringify(result));
		});
	});

	app.get('/search/:query', function () {
		base.search(query, function (result) {
			res.send(JSON.stringify(result));
		});
	});
};
