'use strict';

const async = require('async');
const config = require('config');
const request = require('request');
const bcrypt = require('bcrypt');

const db = require('../db');
const cache = require('../cache');
const utils = require('../utils');

module.exports = {

	login: (session, identifier, password, cb) => {

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
						cache.addRow('sessions', Object.assign(user, { sessionId: utils.guid() }));

						next(null, { status: 'failure', message: 'Login successful', user });
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
			(next) => {
				request({
					url: 'https://www.google.com/recaptcha/api/siteverify',
					method: 'POST',
					form: {
						'secret': config.get("apis.recaptcha.secret"),
						'response': recaptcha
					}
				}, next);
			},

			// check if the response from Google recaptcha is successful
			// if it is, we check if a user with the requested username already exists
			(response, body, next) => {
				let json = JSON.parse(body);
				console.log(json);
				if (json.success !== true) return next('Response from recaptcha was not successful');
				db.models.user.findOne({ 'username': username }, next);
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
					username: username,
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

	logout: (session, cb) => {

		if (!session) return cb({ status: 'failure', message: `You're not currently logged in` });

		session = null;

		cb({ status: 'success', message: `You've been successfully logged out` });
	},

	findByUsername: (session, username, cb) => {
		db.models.user.find({ username }, (err, account) => {
			if (err) throw err;
			account = account[0];
			cb({
				status: 'success',
				data: {
					username: account.username,
					createdAt: account.createdAt,
					statistics: account.statistics
				}
			});
		});
	}

};
