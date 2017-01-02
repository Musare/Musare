'use strict';

const async = require('async');
const config = require('config');
const request = require('request');
const bcrypt = require('bcrypt');

const db = require('../db');
const cache = require('../cache');
const utils = require('../utils');
const hooks = require('./hooks');
const sha256 = require('sha256');
const logger = require('../logger');

cache.sub('user.updateUsername', user => {
	utils.socketsFromUser(user._id, sockets => {
		sockets.forEach(socket => {
			socket.emit('event:user.username.changed', user.username);
		});
	});
});

module.exports = {

	/**
	 * Logs user in
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} identifier - the email of the user
	 * @param {String} password - the plaintext of the user
	 * @param {Function} cb - gets called with the result
	 */
	login: (session, identifier, password, cb) => {

		identifier = identifier.toLowerCase();

		async.waterfall([

			// check if a user with the requested identifier exists
			(next) => db.models.user.findOne({
				$or: [{ 'email.address': identifier }]
			}, next),

			// if the user doesn't exist, respond with a failure
			// otherwise compare the requested password and the actual users password
			(user, next) => {
				if (!user) return next('User not found');
				if (!user.services.password || !user.services.password.password) return next('The account you are trying to access uses GitHub to log in.');
				bcrypt.compare(sha256(password), user.services.password.password, (err, match) => {

					if (err) return next(err);
					if (!match) return next('Incorrect password');

					// if the passwords match

					// store the session in the cache
					let sessionId = utils.guid();
					cache.hset('sessions', sessionId, cache.schemas.session(sessionId, user._id), (err) => {
						if (err) return next(err);
						next(null, sessionId);
					});
				});
			}

		], (err, sessionId) => {
			if (err && err !== true) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				logger.error("USER_PASSWORD_LOGIN", "Login failed with password for user " + identifier + '. "' + error + '"');
				return cb({ status: 'failure', message: error });
			}
			logger.success("USER_PASSWORD_LOGIN", "Login successful with password for user " + identifier);
			cb({ status: 'success', message: 'Login successful', user: {}, SID: sessionId });
		});

	},

	/**
	 * Registers a new user
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} username - the username for the new user
	 * @param {String} email - the email for the new user
	 * @param {String} password - the plaintext password for the new user
	 * @param {Object} recaptcha - the recaptcha data
	 * @param {Function} cb - gets called with the result
	 */
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
				if (json.success !== true) return next('Response from recaptcha was not successful.');
				db.models.user.findOne({ username: new RegExp(`^${username}$`, 'i') }, next);
			},

			// if the user already exists, respond with that
			// otherwise check if a user with the requested email already exists
			(user, next) => {
				if (user) return next('A user with that username already exists.');
				db.models.user.findOne({ 'email.address': email }, next);
			},

			// if the user already exists, respond with that
			// otherwise, generate a salt to use with hashing the new users password
			(user, next) => {
				if (user) return next('A user with that email already exists.');
				bcrypt.genSalt(10, next);
			},

			// hash the password
			(salt, next) => {
				bcrypt.hash(sha256(password), salt, next)
			},

			// save the new user to the database
			(hash, next) => {
				db.models.user.create({
					_id: utils.generateRandomString(12),//TODO Check if exists
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
				next();
			}

		], (err) => {
			if (err && err !== true) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				logger.error("USER_PASSWORD_REGISTER", "Register failed with password for user. " + '"' + error + '"');
				cb({status: 'failure', message: error});
			} else {
				module.exports.login(session, email, password, (result) => {
					let obj = {status: 'success', message: 'Successfully registered.'};
					if (result.status === 'success') {
						obj.SID = result.SID;
					}
					logger.success("USER_PASSWORD_REGISTER", "Register successful with password for user '" + username + "'.");
					cb({status: 'success', message: 'Successfully registered.'});
				});
			}
		});

	},

	/**
	 * Logs out a user
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	logout: (session, cb) => {

		cache.hget('sessions', session.sessionId, (err, session) => {
			if (err || !session) {
				//TODO Properly return err message
				logger.error("USER_LOGOUT", "Logout failed. Couldn't get session.");
				return cb({ 'status': 'failure', message: 'Something went wrong while logging you out.' });
			}

			cache.hdel('sessions', session.sessionId, (err) => {
				if (err) {
					logger.error("USER_LOGOUT", "Logout failed. Failed deleting session from cache.");
					return cb({ 'status': 'failure', message: 'Something went wrong while logging you out.' });
				}
				logger.success("USER_LOGOUT", "Logout successful.");
				return cb({ 'status': 'success', message: 'You have been successfully logged out.' });
			});
		});

	},

	/**
	 * Gets user object from username (only a few properties)
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} username - the username of the user we are trying to find
	 * @param {Function} cb - gets called with the result
	 */
	findByUsername: (session, username, cb) => {
		db.models.user.findOne({ username: new RegExp(`^${username}$`, 'i') }, (err, account) => {
			if (err) {
				logger.error("FIND_BY_USERNAME", "Find by username failed for username '" + username + "'. Mongo error.");
				return cb({ 'status': 'error', message: err.message });
			}
			else if (!account) {
				logger.error("FIND_BY_USERNAME", "User not found for username '" + username + "'.");
				return cb({
					status: 'error',
					message: 'User cannot be found'
				});
			} else {
				logger.success("FIND_BY_USERNAME", "User found for username '" + username + "'.");
				return cb({
					status: 'success',
					data: {
						_id: account._id,
						username: account.username,
						role: account.role,
						email: account.email.address,
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
	/**
	 * Gets user info from session
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	findBySession: (session, cb) => {
		cache.hget('sessions', session.sessionId, (err, session) => {
			if (err) {
				logger.error("FIND_BY_SESSION", "Failed getting session. Redis error. '" + err + "'.");
				return cb({ 'status': 'error', message: err.message });
			}
			if (!session) {
				logger.error("FIND_BY_SESSION", "Session not found. Not logged in.");
				return cb({ 'status': 'error', message: 'You are not logged in' });
			}
			db.models.user.findOne({ _id: session.userId }, (err, user) => {
				if (err) {
					logger.error("FIND_BY_SESSION", "User not found. Failed getting user. Mongo error.");
					throw err;
				} else if (user) {
					let userObj = {
						email: {
							address: user.email.address
						},
						username: user.username
					};
					if (user.services.password && user.services.password.password) userObj.password = true;
					logger.success("FIND_BY_SESSION", "User found. '" + user.username + "'.");
					return cb({
						status: 'success',
						data: userObj
					});
				}
			});
		});

	},

	/**
	 * Updates a user's username
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} newUsername - the new username
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	updateUsername: hooks.loginRequired((session, newUsername, cb, userId) => {
		db.models.user.findOne({ _id: userId }, (err, user) => {
			if (err) {
				logger.error("UPDATE_USERNAME", `Failed getting user. Mongo error. '${err.message}'.`);
				return cb({ status: 'error', message: 'Something went wrong.' });
			} else if (!user) {
				logger.error("UPDATE_USERNAME", `User not found. '${userId}'`);
				return cb({ status: 'error', message: 'User not found' });
			} else if (user.username !== newUsername) {
				if (user.username.toLowerCase() !== newUsername.toLowerCase()) {
					db.models.user.findOne({ username: new RegExp(`^${newUsername}$`, 'i') }, (err, _user) => {
						if (err) {
							logger.error("UPDATE_USERNAME", `Failed to get other user with the same username. Mongo error. '${err.message}'`);
							return cb({ status: 'error', message: err.message });
						}
						if (_user) {
							logger.error("UPDATE_USERNAME", `Username already in use.`);
							return cb({ status: 'failure', message: 'That username is already in use' });
						}
						db.models.user.update({ _id: userId }, { $set: { username: newUsername } }, (err) => {
							if (err) {
								logger.error("UPDATE_USERNAME", `Couldn't update user. Mongo error. '${err.message}'`);
								return cb({ status: 'error', message: err.message });
							}
							cache.pub('user.updateUsername', {
								username: newUsername,
								_id: userId
							});
							logger.success("UPDATE_USERNAME", `Updated username. '${userId}' '${newUsername}'`);
							cb({ status: 'success', message: 'Username updated successfully' });
						});
					});
				} else {
					db.models.user.update({ _id: userId }, { $set: { username: newUsername } }, (err) => {
						if (err) {
							logger.error("UPDATE_USERNAME", `Couldn't update user. Mongo error. '${err.message}'`);
							return cb({ status: 'error', message: err.message });
						}
						cache.pub('user.updateUsername', {
							username: newUsername,
							_id: userId
						});
						logger.success("UPDATE_USERNAME", `Updated username. '${userId}' '${newUsername}'`);
						cb({ status: 'success', message: 'Username updated successfully' });
					});
				}
			} else {
				logger.error("UPDATE_USERNAME", `New username is the same as the old username. '${newUsername}'`);
				cb({ status: 'error', message: 'Your new username cannot be the same as your old username' });
			}
		});
	}),

	/**
	 * Updates a user's email
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} newEmail - the new email
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	updateEmail: hooks.loginRequired((session, newEmail, cb, userId) => {
		newEmail = newEmail.toLowerCase();
		db.models.user.findOne({ _id: userId }, (err, user) => {
			if (err) {
				logger.error("UPDATE_EMAIL", `Failed getting user. Mongo error. '${err.message}'.`);
				return cb({ status: 'error', message: 'Something went wrong.' });
			} else if (!user) {
				logger.error("UPDATE_EMAIL", `User not found. '${userId}'`);
				return cb({ status: 'error', message: 'User not found.' });
			} else if (user.email.address !== newEmail) {
				db.models.user.findOne({"email.address": newEmail}, (err, _user) => {
					if (err) {
						logger.error("UPDATE_EMAIL", `Couldn't get other user with new email. Mongo error. '${newEmail}'`);
						return cb({ status: 'error', message: err.message });
					} else if (_user) {
						logger.error("UPDATE_EMAIL", `Email already in use.`);
						return cb({ status: 'failure', message: 'That email is already in use.' });
					}
					db.models.user.update({_id: userId}, {$set: {"email.address": newEmail}}, (err) => {
						if (err) {
							logger.error("UPDATE_EMAIL", `Couldn't update user. Mongo error. ${err.message}`);
							return cb({ status: 'error', message: err.message });
						}
						logger.success("UPDATE_EMAIL", `Updated email. '${userId}' ${newEmail}'`);
						cb({ status: 'success', message: 'Email updated successfully.' });
					});
				});
			} else {
				logger.error("UPDATE_EMAIL", `New email is the same as the old email.`);
				cb({
					status: 'error',
					message: 'Email has not changed. Your new email cannot be the same as your old email.'
				});
			}
		});
	}),

	/**
	 * Updates a user's role
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} updatingUserId - the updating user's id
	 * @param {String} newRole - the new role
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	updateRole: hooks.adminRequired((session, updatingUserId, newRole, cb, userId) => {
		newRole = newRole.toLowerCase();
		db.models.user.update({_id: updatingUserId}, {$set: {role: newRole}}, (err) => {
			if (err) {
				logger.error("UPDATE_ROLE", `Failed updating user. Mongo error. '${err.message}'.`);
				return cb({ status: 'error', message: 'Something went wrong.' });
			}
			logger.error("UPDATE_ROLE", `User '${userId}' updated the role of user '${updatingUserId}' to role '${newRole}'.`);
			cb({
				status: 'success',
				message: 'Role successfully updated.'
			});
		});
	}),

	/**
	 * Updates a user's password
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} newPassword - the new password
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	updatePassword: hooks.loginRequired((session, newPassword, cb, userId) => {
		async.waterfall([
			(next) => {
				db.models.user.findOne({_id: userId}, next);
			},

			(user, next) => {
				if (!user.services.password) return next('This account does not have a password set.');
				next();
			},

			(next) => {
				bcrypt.genSalt(10, next);
			},

			// hash the password
			(salt, next) => {
				bcrypt.hash(sha256(newPassword), salt, next);
			},

			(hashedPassword, next) => {
				db.models.user.update({_id: userId}, {$set: {"services.password.password": hashedPassword}}, next);
			}
		], (err) => {
			if (err) {
				logger.error("UPDATE_PASSWORD", `Failed updating user. Mongo error. '${err.message}'.`);
				return cb({ status: 'error', message: 'Something went wrong.' });
			}

			logger.error("UPDATE_PASSWORD", `User '${userId}' updated their password.`);
			cb({
				status: 'success',
				message: 'Password successfully updated.'
			});
		});
	})
};
