'use strict';

// This file contains all the logic for Express

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('config');
const request = require('request');
const cache = require('./cache');
const db = require('./db');
let utils;
const OAuth2 = require('oauth').OAuth2;



const lib = {

	app: null,
	server: null,

	init: (cb) => {

		utils = require('./utils');

		let app = lib.app = express();

		lib.server = app.listen(80);

		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({ extended: true }));

		let corsOptions = Object.assign({}, config.get('cors'));

		app.use(cors(corsOptions));
		app.options('*', cors(corsOptions));

		let oauth2 = new OAuth2(
			config.get('apis.github.client'),
			config.get('apis.github.secret'),
			'https://github.com/',
			'login/oauth/authorize',
			'login/oauth/access_token',
			null
		);

		let redirect_uri = config.get('serverDomain') + '/auth/github/authorize/callback';

		app.get('/auth/github/authorize', (req, res) => {
			let params = [
				`client_id=${config.get('apis.github.client')}`,
				`redirect_uri=${config.get('serverDomain')}/auth/github/authorize/callback`,
				`scope=user:email`
			].join('&');
			res.redirect(`https://github.com/login/oauth/authorize?${params}`);
		});

		function redirectOnErr (req, res, next) {
			return res.redirect('http://' + config.get('domain') + '/?err=' + encodeURIComponent('err'));
		}

		app.get('/auth/github/authorize/callback', (req, res) => {
			let code = req.query.code;
			oauth2.getOAuthAccessToken(code, { redirect_uri }, (err, access_token, refresh_token, results) => {
				if (!err) request.get({
						url: `https://api.github.com/user?access_token=${access_token}`,
						headers: { 'User-Agent': 'request' }
					}, (err, httpResponse, body) => {
						if (err) return redirectOnErr('err');
						body = JSON.parse(body);
						db.models.user.findOne({'services.github.id': body.id}, (err, user) => {
							if (err) return redirectOnErr('err');
							if (user) {
								user.services.github.access_token = access_token;
								user.save(err => {
									if (err) return redirectOnErr('err');
									let sessionId = utils.guid();
									cache.hset('sessions', sessionId, cache.schemas.session(sessionId, user._id), err => {
										if (err) return redirectOnErr('err');
										res.cookie('SID', sessionId);
										res.redirect(`http://${config.get('domain')}/`);
									});
								});
							} else {
								db.models.user.findOne({ username: new RegExp(`^${body.login}$`, 'i') }, (err, user) => {
									if (err) return redirectOnErr('err');
									if (user) return redirectOnErr('err');
									else request.get({
										url: `https://api.github.com/user/emails?access_token=${access_token}`,
										headers: {'User-Agent': 'request'}
									}, (err, httpResponse, res) => {
										if (err) return redirectOnErr('err');
										res = JSON.parse(res);
										let address;
										res.forEach(email => {
											if (email.primary) address = email.email.toLowerCase();
										});
										db.models.user.findOne({ 'email.address': address }, (err, user) => {
											if (err) return redirectOnErr('err');
											if (user) return redirectOnErr('err');
											else db.models.user.create({
												username: body.login,
												email: {
													address,
													verificationToken: utils.generateRandomString(64)
												},
												services: {
													github: { id: body.id, access_token }
												}
											}, (err, user) => {
												if (err) return redirectOnErr('err');
												//TODO Send verification email
												let sessionId = utils.guid();
												cache.hset('sessions', sessionId, cache.schemas.session(sessionId, user._id), err => {
													if (err) return redirectOnErr('err');
													res.cookie('SID', sessionId);
													res.redirect(`http://${config.get('domain')}/`);
												});
											});
										});
									});
								});
							}
						});
					});
				else return redirectOnErr('err');
			});
		});

		cb();
	}
};

module.exports = lib;
