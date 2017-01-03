'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('config');
const async = require('async');
const logger = require('./logger');
const mail = require('./mail');
const request = require('request');
const OAuth2 = require('oauth').OAuth2;

const api = require('./api');
const cache = require('./cache');
const db = require('./db');

let utils;

const lib = {

	app: null,
	server: null,

	init: (cb) => {

		utils = require('./utils');

		let app = lib.app = express();

		lib.server = app.listen(config.get('serverPort'));

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
										let date = new Date();
										date.setTime(new Date().getTime() + (2 * 365 * 24 * 60 * 60 * 1000));
										res.cookie('SID', sessionId, {expires: date, secure: config.get("cookie.secure"), path: "/", domain: config.get("cookie.domain")});
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
											let verificationToken = utils.generateRandomString(64);
											if (err) return redirectOnErr(res, err.message);
											if (user) return redirectOnErr(res, 'An account with that email address already exists.');
											else db.models.user.create({
												_id: utils.generateRandomString(12),//TODO Check if exists
												username: body.login,
												email: {
													address,
													verificationToken: verificationToken
												},
												services: {
													github: {id: body.id, access_token}
												}
											}, (err, user) => {
												if (err) return redirectOnErr(res, err.message);
												mail.schemas.verifyEmail(address, body.login, verificationToken);
												let sessionId = utils.guid();
												cache.hset('sessions', sessionId, cache.schemas.session(sessionId, user._id), err => {
													if (err) return redirectOnErr(res, err.message);
													let date = new Date();
													date.setTime(new Date().getTime() + (2 * 365 * 24 * 60 * 60 * 1000));
													res.cookie('SID', sessionId, {expires: date, secure: config.get("cookie.secure"), path: "/", domain: config.get("cookie.domain")});
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

		app.get('/auth/verify_email', (req, res) => {
			let code = req.query.code;

			async.waterfall([
				(next) => {
					if (!code) return next('Invalid code.');
					next();
				},

				(next) => {
					db.models.user.findOne({"email.verificationToken": code}, next);
				},

				(user, next) => {
					if (!user) return next('User not found.');
					if (user.email.verified) return next('This email is already verified.');
					db.models.user.update({"email.verificationToken": code}, {$set: {"email.verified": true}, $unset: {"email.verificationToken": ''}}, next);
				}
			], (err) => {
				if (err) {
					let error = 'An error occurred.';
					if (typeof err === "string") error = err;
					else if (err.message) error = err.message;
					logger.error("VERIFY_EMAIL", `Verifying email failed. "${error}"`);
					return res.json({ status: 'failure', message: error});
				}
				logger.success("VERIFY_EMAIL", `Successfully verified email.`);
				res.redirect(config.get("domain"));
			});
		});

		cb();
	}
};

module.exports = lib;
