'use strict';

const async = require('async');
const config = require('config');
const request = require('request');
const bcrypt = require('bcrypt');

const db = require('../db');
const cache = require('../cache');
const utils = require('../utils');

module.exports = {

	login: (sessionId, identifier, password, cb) => {

		async.waterfall([

			// check if a user with the requested identifier exists
			(next) => db.models.user.findOne({
				$or: [{ 'username': identifier }, { 'email.address': identifier }]
			}, next),

			// if the user doesn't exist, respond with a failure
			// otherwise compare the requested password and the actual users password
			(user, next) => {
				if (!user) return next(true, { status: 'failure', message: 'User not found' });
				bcrypt.compare(password, user.services.password.password, (err, match) => {

					if (err) return next(err);

					// if the passwords match
					if (match) {

						// store the session in the cache
						let userSessionId = utils.guid();
						cache.hset('userSessions', userSessionId, cache.schemas.userSession(user._id), (err) => {
							if (!err) {
								console.log(sessionId, 222);
								cache.hget('sessions', sessionId, (err, session) => {
									console.log(err, session, 333);
									session.userSessionId = userSessionId;
									cache.hset('sessions', sessionId, session, (err) => {
										next(null, { status: 'success', message: 'Login successful', user, SID: userSessionId });
									})
								})
							}
						});
					}
					else {
						next(null, { status: 'failure', message: 'User not found' });
					}
				});
			}

		], (err, payload) => {

			// log this error somewhere
			if (err && err !== true) {
				console.error(err);
				return cb({ status: 'error', message: 'An error occurred while logging in' });
			}

			cb(payload);
		});

	},

	register: (session, username, email, password, recaptcha, cb) => {

		async.waterfall([

			// verify the request with google recaptcha
			/*(next) => {
				request({
					url: 'https://www.google.com/recaptcha/api/siteverify',
					method: 'POST',
					form: {
						//'secret': config.get("apis.recaptcha.secret"),
						'response': recaptcha
					}
				}, next);
			},*/

			// check if the response from Google recaptcha is successful
			// if it is, we check if a user with the requested username already exists
			(/*response, body, */next) => {
				/*let json = JSON.parse(body);
				console.log(json);*/
				//if (json.success !== true) return next('Response from recaptcha was not successful');
				db.models.user.findOne({ username }, next);
			},

			// if the user already exists, respond with that
			// otherwise check if a user with the requested email already exists
			(user, next) => {
				if (user) return next(true, { status: 'failure', message: 'A user with that username already exists' });
				db.models.user.findOne({ 'email.address': email }, next);
			},

			// if the user already exists, respond with that
			// otherwise, generate a salt to use with hashing the new users password
			(user, next) => {
				if (user) return next(true, { status: 'failure', message: 'A user with that email already exists' });
				bcrypt.genSalt(10, next);
			},

			// hash the password
			(salt, next) => {
				bcrypt.hash(password, salt, next)
			},

			// save the new user to the database
			(hash, next) => {
				db.models.user.create({
					username,
					email: {
						address: email,
						verificationToken: utils.generateRandomString(64)
					},
					services: {
						password: {
							password: hash
						}
					}
				}, next);
			},

			// respond with the new user
			(newUser, next) => {
				next(null, { status: 'success', user: newUser })
			}

		], (err, payload) => {
			// log this error somewhere
			if (err && err !== true) {
				console.error(err);
				return cb({ status: 'error', message: 'An error occurred while registering for an account' });
			}
			// respond with the payload that was passed to us earlier
			cb(payload);
		});

	},

	logout: (sessionId, cb) => {

		cache.hget('sessions', sessionId, (err, session) => {
			if (err || !session) return cb({ 'status': 'failure', message: 'Something went wrong while logging you out.' });
			if (!session.userSessionId) return cb({ 'status': 'failure', message: 'You are not logged in.' });

			cache.hget('userSessions', session.userSessionId, (err, userSession) => {
				if (err || !userSession) return cb({ 'status': 'failure', message: 'Something went wrong while logging you out.' });
				if (!userSession) return cb({ 'status': 'failure', message: 'You are not logged in.' });

				cache.hdel('userSessions', session.userSessionId, (err) => {
					if (err || !userSession) return cb({ 'status': 'failure', message: 'Something went wrong while logging you out.' });
					return cb({ 'status': 'success', message: 'You have been successfully logged out.' });
				});
			});
		});

	},

	findByUsername: (session, username, cb) => {
		db.models.user.find({ username }, (err, account) => {
			if (err) throw err;
			else if (account.length == 0) {
				return cb({
					status: 'error',
					message: 'Username cannot be found'
				});
			} else {
				account = account[0];
				return cb({
					status: 'success',
					data: {
						username: account.username,
						email: account.email.address,
						password: '',
						createdAt: account.createdAt,
						statistics: account.statistics
					}
				});
			}
		});
	},

	findBySession: (session, cb) => {
		return cb({
			status: 'success',
			data: session
		});
	},

	update: (session, user_id, property, value, cb) => {
        db.models.user.findOne({ _id: user_id }, (err, user) => {
            if (err) throw err;
            else if (!user) cb({ status: 'error', message: 'Invalid User ID' });
            else if (user[property] && user[property] !== value) {
                if (property == 'services.password.password') {
                    bcrypt.compare(user[property], value, (err, res) => {
                        if (err) throw err;
                        bcrypt.genSalt(10, (err, salt) => {
                            if (err) throw err;
                            bcrypt.hash(value, salt, (err, hash) => {
                                if (err) throw err;
                                user[property] = hash;
                            });
                        });
                    });
                } else user[property] = value;
                user.save(err => {
                    if (err) cb({ status: 'error', message: err.message });
                });
            } else {
                cb({ status: 'error', message: 'Field has not changed' });
            }
        });
    },


};
