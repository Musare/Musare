'use strict';

module.exports = function (core, app) {

	app.post('/users/login', function (req, res) {

		// TODO: Give this a better error message
		if (!req.body.user) {
			return res.send(JSON.stringify({ 'status': 'error', 'message': 'invalid request' }));
		}

		core['/users/login'](req.body.user, function (result) {
			res.send(JSON.stringify(result));
		});
	});

	app.post('/users/register', function (req, res) {

		// TODO: Give this a better error message
		if (!req.body.user) {
			return res.send(JSON.stringify({ 'status': 'error', 'message': 'invalid request' }));
		}

		core['/users/register'](req.body.user, function (result) {
			res.send(JSON.stringify(result));
		});
	});

	app.get('/stations', function (req, res) {
		core['/stations'](function (result) {
			res.send(JSON.stringify(result));
		});
	});

	app.get('/stations/join/:id', function (req, res) {
		core['/stations/join/:id'](req.params.id, function (result) {
			res.send(JSON.stringify(result));
		});
	});

	app.get('/stations/search/:query', function (req, res) {
		core['/stations/search/:query'](req.params.query, function (result) {
			res.send(JSON.stringify(result));
		});
	});
};
