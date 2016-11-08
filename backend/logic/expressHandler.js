'use strict';

// npm modules
const passport  = require('passport');

module.exports = (core, app) => {

	app.post('/users/login', passport.authenticate('local'), function(req, res) {
		console.log('posted');
		res.json(JSON.stringify(req.user));
	});

	app.post('/users/register', function(req, res) {
		core['/users/register'](req.body.username, req.body.email, req.body.password, req.body.recaptcha, result => {
			res.send(JSON.stringify(result));
		});
	});

	app.post('/users/logout', function(req, res) {
		req.logout();
		res.end();
	});
};
