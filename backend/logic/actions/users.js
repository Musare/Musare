'use strict';

const async = require('async');
const config = require('config');
const request = require('request');
const bcrypt = require('bcrypt');

const db = require('../db');
const cache = require('../cache');
const utils = require('../utils');
const hooks = require('./hooks');

module.exports = {

	login: (session, identifier, password, cb) => {

		identifier = identifier.toLowerCase();

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
						let sessionId = utils.guid();
						cache.hset('sessions', sessionId, cache.schemas.session(sessionId, user._id), (err) => {
							if (!err) {
								//TODO See if it is necessary to add new SID to socket.
								next(null, { status: 'success', message: 'Login successful', user, SID: sessionId });
							} else {
								next(null, { status: 'failure', message: 'Something went wrong' });
							}
						});
					}
					else {
						next(null, { status: 'failure', message: 'Incorrect password' });
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

	register: function(session, username, email, password, recaptcha, cb) {
		email = email.toLowerCase();
		async.waterfall([

			// verify the request with google recaptcha
			(next) => {
				request({
					url: 'https://www.google.com/recaptcha/api/siteverify',
					method: 'POST',
					form: {
						'secret': config.get("apis").recaptcha.secret,
						'response': recaptcha
					}
				}, next);
			},

			// check if the response from Google recaptcha is successful
			// if it is, we check if a user with the requested username already exists
			(response, body, next) => {
				let json = JSON.parse(body);
				if (json.success !== true) return next('Response from recaptcha was not successful');
				db.models.user.findOne({ username: new RegExp(`^${username}$`, 'i') }, next);
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
				//TODO Send verification email
				next(null, { status: 'success', user: newUser })
			}

		], (err, payload) => {
			// log this error somewhere
			if (err && err !== true) {
				console.error(err);
				return cb({ status: 'error', message: 'An error occurred while registering for an account' });
			} else {
				module.exports.login(session, email, password, (result) => {
					let obj = {status: 'success', message: 'Successfully registered.'};
					if (result.status === 'success') {
						obj.SID = result.SID;
					}
					cb(obj);
				});
			}
		});

	},

	logout: (session, cb) => {

		cache.hget('sessions', session.sessionId, (err, session) => {
			if (err || !session) return cb({ 'status': 'failure', message: 'Something went wrong while logging you out.' });

			cache.hdel('sessions', session.sessionId, (err) => {
				if (err) return cb({ 'status': 'failure', message: 'Something went wrong while logging you out.' });
				return cb({ 'status': 'success', message: 'You have been successfully logged out.' });
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
						_id: account._id,
						username: account.username,
						role: account.role,
						email: account.email.address,
						password: '',
						createdAt: account.createdAt,
						statistics: account.statistics,
						liked: account.liked,
						disliked: account.disliked
					}
				});
			}
		});
	},

	//TODO Fix security issues
	findBySession: (session, cb) => {
		cache.hget('sessions', session.sessionId, (err, session) => {
			if (err) return cb({ 'status': 'error', message: err });
			if (!session) return cb({ 'status': 'error', message: 'You are not logged in' });
			db.models.user.findOne({ _id: session.userId }, {username: 1, "email.address": 1}, (err, user) => {
				if (err) { throw err; } else if (user) {
					return cb({
						status: 'success',
						data: user
					});
				}
			});
		});

	},

	updateUsername: hooks.loginRequired((session, newUsername, cb, userId) => {
		db.models.user.findOne({ _id: userId }, (err, user) => {
			if (err) console.error(err);
			if (!user) return cb({ status: 'error', message: 'User not found.' });
			if (user.username !== newUsername) {
				if (user.username.toLowerCase() !== newUsername.toLowerCase()) {
					db.models.user.findOne({username: new RegExp(`^${newUsername}$`, 'i')}, (err, _user) => {
						if (err) return cb({ status: 'error', message: err.message });
						if (_user) return cb({ status: 'failure', message: 'That username is already in use.' });
						db.models.user.update({_id: userId}, {$set: {username: newUsername}}, (err) => {
							if (err) return cb({ status: 'error', message: err.message });
							cb({ status: 'success', message: 'Username updated successfully.' });
						});
					});
				} else {
					db.models.user.update({_id: userId}, {$set: {username: newUsername}}, (err) => {
						if (err) return cb({ status: 'error', message: err.message });
						cb({ status: 'success', message: 'Username updated successfully.' });
					});
				}
			} else cb({ status: 'error', message: 'Username has not changed. Your new username cannot be the same as your old username.' });
		});
	}),

	updateEmail: hooks.loginRequired((session, newEmail, cb, userId) => {
		newEmail = newEmail.toLowerCase();
		db.models.user.findOne({ _id: userId }, (err, user) => {
			if (err) console.error(err);
			if (!user) return cb({ status: 'error', message: 'User not found.' });
			if (user.email.address !== newEmail) {
				db.models.user.findOne({"email.address": newEmail}, (err, _user) => {
					if (err) return cb({ status: 'error', message: err.message });
					if (_user) return cb({ status: 'failure', message: 'That email is already in use.' });
					db.models.user.update({_id: userId}, {$set: {"email.address": newEmail}}, (err) => {
						if (err) return cb({ status: 'error', message: err.message });
						cb({ status: 'success', message: 'Email updated successfully.' });
					});
				});
			} else cb({ status: 'error', message: 'Email has not changed. Your new email cannot be the same as your old email.' });
		});
	})

};
