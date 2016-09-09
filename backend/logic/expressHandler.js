'use strict';

module.exports = (core, app) => {

	app.post('/users/login', (req, res) => {

		// TODO: Give this a better error message
		if (!req.body.user) {
			return res.send(JSON.stringify({ 'status': 'error', 'message': 'invalid request' }));
		}

		core['/users/login'](req.body.user, result => {
			res.send(JSON.stringify(result));
			console.log(JSON.stringify(result));
		});
	});

	app.post('/users/register', (req, res) => {
		core['/users/register'](req.body.user, (result) => {
			res.send(JSON.stringify(result));
		});
		console.log('posted');
	});

	app.get('/stations', (req, res) => {
		core['/stations'](result => {
			res.send(JSON.stringify(result));
		});
	});

	app.get('/stations/join/:id', (req, res) => {
		core['/stations/join/:id'](req.params.id, result => {
			res.send(JSON.stringify(result));
		});
	});

	app.get('/stations/search/:query', (req, res) => {
		core['/stations/search/:query'](req.params.query, result => {
			res.send(JSON.stringify(result));
		});
	});
};
