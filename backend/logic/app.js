'use strict';

const coreClass = require("../core");

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const config = require('config');
const async = require('async');
const request = require('request');
const OAuth2 = require('oauth').OAuth2;

module.exports = class extends coreClass {
	initialize() {
		return new Promise((resolve, reject) => {
			this.setStage(1);

			const 	logger 	= this.logger,
					mail	= this.moduleManager.modules["mail"],
					cache	= this.moduleManager.modules["cache"],
					db		= this.moduleManager.modules["db"];
			
			this.utils = this.moduleManager.modules["utils"];

			let app = this.app = express();
			const SIDname = config.get("cookie.SIDname");
			this.server = app.listen(config.get('serverPort'));

			app.use(cookieParser());

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

			app.get('/auth/github/authorize', async (req, res) => {
				try { await this._validateHook(); } catch { return; }
				let params = [
					`client_id=${config.get('apis.github.client')}`,
					`redirect_uri=${config.get('serverDomain')}/auth/github/authorize/callback`,
					`scope=user:email`
				].join('&');
				res.redirect(`https://github.com/login/oauth/authorize?${params}`);
			});

			app.get('/auth/github/link', async (req, res) => {
				try { await this._validateHook(); } catch { return; }
				let params = [
					`client_id=${config.get('apis.github.client')}`,
					`redirect_uri=${config.get('serverDomain')}/auth/github/authorize/callback`,
					`scope=user:email`,
					`state=${req.cookies[SIDname]}`
				].join('&');
				res.redirect(`https://github.com/login/oauth/authorize?${params}`);
			});

			function redirectOnErr (res, err){
				return res.redirect(`${config.get('domain')}/?err=${encodeURIComponent(err)}`);
			}

			app.get('/auth/github/authorize/callback', async (req, res) => {
				try { await this._validateHook(); } catch { return; }
				let code = req.query.code;
				let access_token;
				let body;
				let address;
				const state = req.query.state;

				async.waterfall([
					(next) => {
						if (req.query.error) return next(req.query.error_description);
						next();
					},

					(next) => {
						oauth2.getOAuthAccessToken(code, {redirect_uri}, next);
					},

					(_access_token, refresh_token, results, next) => {
						if (results.error) return next(results.error_description);
						access_token = _access_token;
						request.get({
							url: `https://api.github.com/user?access_token=${access_token}`,
							headers: {'User-Agent': 'request'}
						}, next);
					},

					(httpResponse, _body, next) => {
						body = _body = JSON.parse(_body);
						if (httpResponse.statusCode !== 200) return next(body.message);
						if (state) {
							return async.waterfall([
								(next) => {
									cache.hget('sessions', state, next);
								},

								(session, next) => {
									if (!session) return next('Invalid session.');
									db.models.user.findOne({_id: session.userId}, next);
								},

								(user, next) => {
									if (!user) return next('User not found.');
									if (user.services.github && user.services.github.id) return next('Account already has GitHub linked.');
									db.models.user.updateOne({_id: user._id}, {$set: {"services.github": {id: body.id, access_token}}}, {runValidators: true}, (err) => {
										if (err) return next(err);
										next(null, user, body);
									});
								},

								(user) => {
									cache.pub('user.linkGitHub', user._id);
									res.redirect(`${config.get('domain')}/settings`);
								}
							], next);
						}
						if (!body.id) return next("Something went wrong, no id.");
						db.models.user.findOne({'services.github.id': body.id}, (err, user) => {
							next(err, user, body);
						});
					},

					(user, body, next) => {
						if (user) {
							user.services.github.access_token = access_token;
							return user.save(() => {
								next(true, user._id);
							});
						}
						db.models.user.findOne({ username: new RegExp(`^${body.login}$`, 'i' )}, (err, user) => {
							next(err, user);
						});
					},

					(user, next) => {
						if (user) return next('An account with that username already exists.');
						request.get({
							url: `https://api.github.com/user/emails?access_token=${access_token}`,
							headers: {'User-Agent': 'request'}
						}, next);
					},

					(httpResponse, body2, next) => {
						body2 = JSON.parse(body2);
						if (!Array.isArray(body2)) return next(body2.message);
						body2.forEach(email => {
							if (email.primary) address = email.email.toLowerCase();
						});
						db.models.user.findOne({'email.address': address}, next);
					},

					async (user, next) => {
						const verificationToken = await this.utils.generateRandomString(64);
						if (user) return next('An account with that email address already exists.');
						db.models.user.create({
							_id: await this.utils.generateRandomString(12),//TODO Check if exists
							username: body.login,
							email: {
								address,
								verificationToken: verificationToken
							},
							services: {
								github: {id: body.id, access_token}
							}
						}, next);
					},

					(user, next) => {
						mail.schemas.verifyEmail(address, body.login, user.email.verificationToken);
						next(null, user._id);
					}
				], async (err, userId) => {
					if (err && err !== true) {
						err = await this.utils.getError(err);
						logger.error('AUTH_GITHUB_AUTHORIZE_CALLBACK', `Failed to authorize with GitHub. "${err}"`);
						return redirectOnErr(res, err);
					}

					const sessionId = await this.utils.guid();
					cache.hset('sessions', sessionId, cache.schemas.session(sessionId, userId), err => {
						if (err) return redirectOnErr(res, err.message);
						let date = new Date();
						date.setTime(new Date().getTime() + (2 * 365 * 24 * 60 * 60 * 1000));
						res.cookie(SIDname, sessionId, {
							expires: date,
							secure: config.get("cookie.secure"),
							path: "/",
							domain: config.get("cookie.domain")
						});
						logger.success('AUTH_GITHUB_AUTHORIZE_CALLBACK', `User "${userId}" successfully authorized with GitHub.`);
						res.redirect(`${config.get('domain')}/`);
					});
				});
			});

			app.get('/auth/verify_email', async (req, res) => {
				try { await this._validateHook(); } catch { return; }

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
						db.models.user.updateOne({"email.verificationToken": code}, {$set: {"email.verified": true}, $unset: {"email.verificationToken": ''}}, {runValidators: true}, next);
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
					res.redirect(`${config.get("domain")}?msg=Thank you for verifying your email`);
				});
			});

			resolve();
		});
	}
}
