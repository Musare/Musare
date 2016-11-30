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
			config.get("apis.github.client"),
			config.get("apis.github.secret"),
			'https://github.com/',
			'login/oauth/authorize',
			'login/oauth/access_token',
			null
		);

		let redirect_uri = config.get("serverDomain") + "/auth/github/authorize/callback";

		app.get('/auth/github/authorize', (req, res) => {
			let params = [
				`client_id=${config.get("apis.github.client")}`,
				`redirect_uri=http://localhost/auth/github/authorize/callback`,
				`scope=user:email`
			].join('&');
			res.redirect(`https://github.com/login/oauth/authorize?${params}`);
		});

		app.get('/auth/github/authorize/callback', (req, res) => {
			let code = req.query.code;
			oauth2.getOAuthAccessToken(code, {'redirect_uri': redirect_uri}, (error, access_token, refresh_token, results) => {
				if (!error) {
					request.get({
						url: `https://api.github.com/user?access_token=${access_token}`,
						headers: {'User-Agent': 'request'}
					}, (error, httpResponse, body) => {
						if (error) return res.redirect(`http://localhost:8080/?err=${encodeURIComponent("Something went wrong while logging in1.")}`);
						body = JSON.parse(body);
						db.models.user.findOne({"services.github.id": body.id}, (err, user) => {
							if (err) return res.redirect(`http://localhost:8080/?err=${encodeURIComponent("Something went wrong while logging in2.")}`);
							if (user) {
								user.services.github.access_token = access_token;
								user.save((err) => {
									if (err) return res.redirect(`http://localhost:8080/?err=${encodeURIComponent("Something went wrong while logging in3.")}`);
									let userSessionId = utils.guid();
									cache.hset('userSessions', userSessionId, cache.schemas.userSession(user._id), (err) => {
										if (err) return res.redirect(`http://localhost:8080/?err=${encodeURIComponent("Something went wrong while logging in3.")}`);
										res.cookie("SID", userSessionId);
										res.redirect(`http://localhost:8080/`);
									});
								});
							} else {
								db.models.user.findOne({username: new RegExp(`^${body.login}$`, 'i')}, (err, user) => {
									if (err) return res.redirect(`http://localhost:8080/?err=${encodeURIComponent("Something went wrong while logging in4.")}`);
									if (user) {
										res.redirect(`http://localhost:8080/?err=${encodeURIComponent("Something went wrong while logging in5.")}`);
									} else {
										request.get({
											url: `https://api.github.com/user/emails?access_token=${access_token}`,
											headers: {'User-Agent': 'request'}
										}, (error, httpResponse, body2) => {
											if (error) return res.redirect(`http://localhost:8080/?err=${encodeURIComponent("Something went wrong while logging in6.")}`);
											body2 = JSON.parse(body2);
											let primaryEmail;
											body2.forEach((email) => {
												if (email.primary) {
													primaryEmail = email.email.toLowerCase();
												}
											});
											db.models.user.findOne({"email.address": primaryEmail}, (err, user) => {
												if (err) return res.redirect(`http://localhost:8080/?err=${encodeURIComponent("Something went wrong while logging in7.")}`);
												if (user) {
													if (err) return res.redirect(`http://localhost:8080/?err=${encodeURIComponent("Something went wrong while logging in8.")}`);
												} else {
													db.models.user.create({
														username: body.login,
														email: {
															address: primaryEmail,
															verificationToken: utils.generateRandomString(64)
														},
														services: {
															github: {
																id: body.id,
																access_token: access_token
															}
														}
													}, (err, user) => {
														if (err) return res.redirect(`http://localhost:8080/?err=${encodeURIComponent("Something went wrong while logging in9.")}`);
														//TODO Send verification email
														let userSessionId = utils.guid();
														cache.hset('userSessions', userSessionId, cache.schemas.userSession(user._id), (err) => {
															if (err) return res.redirect(`http://localhost:8080/?err=${encodeURIComponent("Something went wrong while logging in3.")}`);
															res.cookie("SID", userSessionId);
															res.redirect(`http://localhost:8080/`);
														});
													});
												}
											});
										});
									}
								});
							}
						});
					});

				} else {
					res.redirect(`http://localhost:8080/?err=${encodeURIComponent("Something went wrong while logging in2.")}`);
				}
			});
		});

		cb();
	}
};

module.exports = lib;
