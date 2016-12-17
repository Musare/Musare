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

		lib.server = app.listen(8080);

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

		function redirectOnErr (res, err){
			return res.redirect(`${config.get('domain')}/?err=${encodeURIComponent(err)}`);
		}

		app.get('/auth/github/authorize/callback', (req, res) => {
			let code = req.query.code;
			oauth2.getOAuthAccessToken(code, { redirect_uri }, (err, access_token, refresh_token, results) => {
				if (!err) request.get({
						url: `https://api.github.com/user?access_token=${access_token}`,
						headers: { 'User-Agent': 'request' }
					}, (err, httpResponse, body) => {
						if (err) return redirectOnErr(res, err.message);
						body = JSON.parse(body);
						db.models.user.findOne({'services.github.id': body.id}, (err, user) => {
							if (err) return redirectOnErr(res, 'err');
							if (user) {
								user.services.github.access_token = access_token;
								user.save(err => {
									if (err) return redirectOnErr(res, err.message);
									let sessionId = utils.guid();
									cache.hset('sessions', sessionId, cache.schemas.session(sessionId, user._id), err => {
										if (err) return redirectOnErr(res, err.message);
										res.cookie('SID', sessionId);
										res.redirect(`${config.get('domain')}/`);
									});
								});
							} else {
								db.models.user.findOne({ username: new RegExp(`^${body.login}$`, 'i') }, (err, user) => {
									if (err) return redirectOnErr(res, err.message);
									if (user) return redirectOnErr(res, 'An account with that username already exists.');
									else request.get({
										url: `https://api.github.com/user/emails?access_token=${access_token}`,
										headers: {'User-Agent': 'request'}
									}, (err, httpResponse, body2) => {
										if (err) return redirectOnErr(res, err.message);
										body2 = JSON.parse(body2);
										let address;
										if (!Array.isArray(body2)) return redirectOnErr(res, body2.message);
										body2.forEach(email => {
											if (email.primary) address = email.email.toLowerCase();
										});
										db.models.user.findOne({'email.address': address}, (err, user) => {
											if (err) return redirectOnErr(res, err.message);
											if (user) return redirectOnErr(res, 'An account with that email address already exists.');
											else db.models.user.create({
												_id: utils.generateRandomString(12),//TODO Check if exists
												username: body.login,
												email: {
													address,
													verificationToken: utils.generateRandomString(64)
												},
												services: {
													github: {id: body.id, access_token}
												}
											}, (err, user) => {
												if (err) return redirectOnErr(res, err.message);
												//TODO Send verification email
												let sessionId = utils.guid();
												cache.hset('sessions', sessionId, cache.schemas.session(sessionId, user._id), err => {
													if (err) return redirectOnErr(res, err.message);
													res.cookie('SID', sessionId);
													res.redirect(`${config.get('domain')}/`);
												});
											});
										});
									});
								});
							}
						});
					});
				else return redirectOnErr(res, 'err');
			});
		});

		cb();
	}
};

module.exports = lib;
