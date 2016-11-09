'use strict';

// npm modules
const passport = require('passport');

module.exports = (core, app) => {

	app.post('/users/login', (req, res, next) => {
		console.log('posted', req.user);
		res.json(JSON.stringify(req.user));
	});

	app.post('/users/register', (req, res) => {
		core['/users/register'](req.body.username, req.body.email, req.body.password, req.body.recaptcha, result => {
			res.send(JSON.stringify(result));
		});
	});
};
