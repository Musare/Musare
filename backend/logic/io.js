'use strict';

// This file contains all the logic for Socket.IO

const coreClass = require("../core");

const socketio = require("socket.io");
const async = require("async");
const config = require("config");

module.exports = class extends coreClass {
	constructor(name, moduleManager) {
		super(name, moduleManager);

		this.dependsOn = ["app", "db", "cache", "utils"];
	}

	initialize() {
		return new Promise(resolve => {
			this.setStage(1);

			const 	logger		= this.logger,
					app			= this.moduleManager.modules["app"],
					cache		= this.moduleManager.modules["cache"],
					utils		= this.moduleManager.modules["utils"],
					db			= this.moduleManager.modules["db"],
					punishments	= this.moduleManager.modules["punishments"];
			
			const actions = require('../logic/actions');

			const SIDname = config.get("cookie.SIDname");

			// TODO: Check every 30s/60s, for all sockets, if they are still allowed to be in the rooms they are in, and on socket at all (permission changing/banning)
			this._io = socketio(app.server);

			this._io.use(async (socket, next) => {
				try { await this._validateHook(); } catch { return; }

				let SID;

				socket.ip = socket.request.headers['x-forwarded-for'] || '0.0.0.0';

				async.waterfall([
					(next) => {
						utils.parseCookies(
							socket.request.headers.cookie
						).then(res => {
							SID = res[SIDname];
							next(null);
						});
					},

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
						// check if a session's user / IP is banned
						punishments.getPunishments((err, punishments) => {
							const isLoggedIn = !!(socket.session && socket.session.refreshDate);
							const userId = (isLoggedIn) ? socket.session.userId : null;

							let banishment = { banned: false, ban: 0 };

							punishments.forEach(punishment => {
								if (punishment.expiresAt > banishment.ban) banishment.ban = punishment;
								if (punishment.type === 'banUserId' && isLoggedIn && punishment.value === userId) banishment.banned = true;
								if (punishment.type === 'banUserIp' && punishment.value === socket.ip) banishment.banned = true;
							});
							
							socket.banishment = banishment;

							next();
						});
					}
				], () => {
					if (!socket.session) socket.session = { socketId: socket.id };
					else socket.session.socketId = socket.id;

					next();
				});
			});

			this._io.on('connection', async socket => {
				try { await this._validateHook(); } catch { return; }

				let sessionInfo = '';
				
				if (socket.session.sessionId) sessionInfo = ` UserID: ${socket.session.userId}.`;

				// if session is banned
				if (socket.banishment && socket.banishment.banned) {
					logger.info('IO_BANNED_CONNECTION', `A user tried to connect, but is currently banned. IP: ${socket.ip}.${sessionInfo}`);
					socket.emit('keep.event:banned', socket.banishment.ban);
					socket.disconnect(true);
				} else {
					logger.info('IO_CONNECTION', `User connected. IP: ${socket.ip}.${sessionInfo}`);

					// catch when the socket has been disconnected
					socket.on('disconnect', () => {
						if (socket.session.sessionId) sessionInfo = ` UserID: ${socket.session.userId}.`;
						logger.info('IO_DISCONNECTION', `User disconnected. IP: ${socket.ip}.${sessionInfo}`);
					});

					// catch errors on the socket (internal to socket.io)
					socket.on('error', console.error);

					// have the socket listen for each action
					Object.keys(actions).forEach(namespace => {
						Object.keys(actions[namespace]).forEach(action => {

							// the full name of the action
							let name = `${namespace}.${action}`;

							// listen for this action to be called
							socket.on(name, async (...args) => {
								let cb = args[args.length - 1];
								if (typeof cb !== "function")
									cb = () => {
										this.logger.info("IO_MODULE", `There was no callback provided for ${name}.`);
									}
								else args.pop();

								try { await this._validateHook(); } catch { return cb({status: 'failure', message: 'Lockdown'}); } 

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

			resolve();
		});
	}

	async io () {
		try { await this._validateHook(); } catch { return; }
		return this._io;
	}
}
