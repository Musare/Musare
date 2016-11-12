'use strict';

const passport = require('passport');

module.exports = (core, app) => {

	app.post('/users/login', (req, res) => {
		console.log('posted', req.user);
		core['/users/login'](req.user, req.body.identifier, req.body.password, result => {
 			res.end(JSON.stringify(result));
 		});
	});

	app.post('/users/register', (req, res) => {
		core['/users/register'](req.user, req.body.username, req.body.email, req.body.password, req.body.recaptcha, result => {
			res.end(JSON.stringify(result));
		});
	});

	app.get('/users/logout', (req, res) => {
		core['/users/logout'](req, result => {
			res.end(JSON.stringify(result));
		})
	})
};
