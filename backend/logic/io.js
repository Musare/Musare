'use strict';

// This file contains all the logic for Socket.IO

const app = require('./app');
const actions = require('./actions');
const async = require('async');
const cache = require('./cache');
const utils = require('./utils');
const db = require('./db');
const logger = require('./logger');
const punishments = require('./punishments');

let initialized = false;
let lockdown = false;

module.exports = {

	io: null,

	init: (cb) => {
		//TODO Check every 30s/60s, for all sockets, if they are still allowed to be in the rooms they are in, and on socket at all (permission changing/banning)
		this.io = require('socket.io')(app.server);

		this.io.use((socket, next) => {
			if (lockdown) return;
			let cookies = socket.request.headers.cookie;
			let SID = utils.cookies.parseCookies(cookies).SID;

			socket.ip = socket.request.headers['x-forwarded-for'] || '0.0.0.0';

			async.waterfall([
				(next) => {
					if (!SID) return next('No SID.');
					next();
				},
				(next) => {
					cache.hget('sessions', SID, next);
				},
				(session, next) => {
					if (!session) return next('No session found.');
					session.refreshDate = Date.now();
					socket.session = session;
					cache.hset('sessions', SID, session, next);
				},
				(res, next) => {
					punishments.getPunishments((err, punishments) => {
						const isLoggedIn = !!(socket.session && socket.session.refreshDate);
						const userId = (isLoggedIn) ? socket.session.userId : null;
						let banned = false;
						punishments.forEach((punishment) => {
							if (punishment.type === 'banUserId' && isLoggedIn && punishment.value === userId) {
								banned = true;
							}
							if (punishment.type === 'banUserIp' && punishment.value === socket.ip) {
								banned = true;
							}
						});
						//socket.banned = banned;
						socket.banned = banned;
						next();
					});
				}
			], () => {
				if (!socket.session) {
					socket.session = {socketId: socket.id};
				} else socket.session.socketId = socket.id;
				next();
			});
		});

		this.io.on('connection', socket => {
			if (lockdown) return socket.disconnect(true);
			let sessionInfo = '';
			if (socket.session.sessionId) sessionInfo = ` UserID: ${socket.session.userId}.`;
			if (socket.banned) {
				logger.info('IO_BANNED_CONNECTION', `A user tried to connect, but is currently banned. IP: ${socket.ip}.${sessionInfo}`);
				socket.emit('keep.me.isBanned');
				socket.disconnect(true);
			} else {
				logger.info('IO_CONNECTION', `User connected. IP: ${socket.ip}.${sessionInfo}`);

				// catch when the socket has been disconnected
				socket.on('disconnect', (reason) => {
					let sessionInfo = '';
					if (socket.session.sessionId) sessionInfo = ` UserID: ${socket.session.userId}.`;
					logger.info('IO_DISCONNECTION', `User disconnected. IP: ${socket.ip}.${sessionInfo}`);
				});

				// catch errors on the socket (internal to socket.io)
				socket.on('error', err => console.error(err));

				// have the socket listen for each action
				Object.keys(actions).forEach((namespace) => {
					Object.keys(actions[namespace]).forEach((action) => {

						// the full name of the action
						let name = `${namespace}.${action}`;

						// listen for this action to be called
						socket.on(name, function () {
							let args = Array.prototype.slice.call(arguments, 0, -1);
							let cb = arguments[arguments.length - 1];

							if (lockdown) return cb({status: 'failure', message: 'Lockdown'});

							// load the session from the cache
							cache.hget('sessions', socket.session.sessionId, (err, session) => {
								if (err && err !== true) {
									if (typeof cb === 'function') return cb({
										status: 'error',
										message: 'An error occurred while obtaining your session'
									});
								}

								// make sure the sockets sessionId isn't set if there is no session
								if (socket.session.sessionId && session === null) delete socket.session.sessionId;

								// call the action, passing it the session, and the arguments socket.io passed us
								actions[namespace][action].apply(null, [socket.session].concat(args).concat([
									(result) => {
										// respond to the socket with our message
										if (typeof cb === 'function') return cb(result);
									}
								]));
							});
						})
					})
				});

				if (socket.session.sessionId) {
					cache.hget('sessions', socket.session.sessionId, (err, session) => {
						if (err && err !== true) socket.emit('ready', false);
						else if (session && session.userId) {
							db.models.user.findOne({ _id: session.userId }, (err, user) => {
								if (err || !user) return socket.emit('ready', false);
								let role = '';
								let username = '';
								let userId = '';
								if (user) {
									role = user.role;
									username = user.username;
									userId = session.userId;
								}
								socket.emit('ready', true, role, username, userId);
							});
						} else socket.emit('ready', false);
					})
				} else socket.emit('ready', false);
			}
		});

		initialized = true;

		if (lockdown) return this._lockdown();
		cb();
	},

	_lockdown: () => {
		this.io.close();
		let connected = this.io.of('/').connected;
		for (let key in connected) {
			connected[key].disconnect('Lockdown');
		}
		lockdown = true;
	}

};