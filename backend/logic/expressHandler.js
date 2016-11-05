'use strict';

// npm modules
const passport  = require('passport');

module.exports = (core, app) => {

	app.post('/users/login', passport.authenticate('local'), function(req, res) {
		console.log("Logged in:", req.user);
		res.json(JSON.stringify(req.user));
	});

	app.post('/users/logout', function(req, res) {
		req.logout();
		res.end();
	});

	app.post('/users/register', function(req, res) {
		core['/users/register'](req.body.username, req.body.email, req.body.password, req.body.recaptcha, result => {
			res.send(JSON.stringify(result));
		});
	});

	app.post('/stations', (req, res) => {
		core['/stations'](result => {
			res.send(result);
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
