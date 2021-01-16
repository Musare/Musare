/**
 * @file
 */

import config from "config";
import async from "async";
import socketio from "socket.io";

import CoreClass from "../core";

let IOModule;
let AppModule;
let CacheModule;
let UtilsModule;
let DBModule;
let PunishmentsModule;

class _IOModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("io");

		IOModule = this;
	}

	/**
	 * Initialises the io module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		this.setStage(1);

		AppModule = this.moduleManager.modules.app;
		CacheModule = this.moduleManager.modules.cache;
		UtilsModule = this.moduleManager.modules.utils;
		DBModule = this.moduleManager.modules.db;
		PunishmentsModule = this.moduleManager.modules.punishments;

		this.actions = (await import("./actions")).default;

		this.userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" });

		this.setStage(2);

		this.SIDname = config.get("cookie.SIDname");

		// TODO: Check every 30s/, for all sockets, if they are still allowed to be in the rooms they are in, and on socket at all (permission changing/banning)
		const server = await AppModule.runJob("SERVER");
		this._io = socketio(server);

		return new Promise(resolve => {
			this.setStage(3);

			this._io.use(async (socket, cb) => {
				IOModule.runJob("HANDLE_IO_USE", { socket, cb });
			});

			this.setStage(4);

			this._io.on("connection", async socket => {
				IOModule.runJob("HANDLE_IO_CONNECTION", { socket });
			});

			this.setStage(5);

			return resolve();
		});
	}

	/**
	 * Returns the socket io variable
	 *
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	IO() {
		return new Promise(resolve => {
			resolve(IOModule._io);
		});
	}

	/**
	 * Returns whether there is a socket for a session id or not
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.sessionId - user session id
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async SOCKET_FROM_SESSION(payload) {
		// socketId
		return new Promise((resolve, reject) => {
			const ns = IOModule._io.of("/");
			if (ns) {
				return resolve(ns.connected[payload.socketId]);
			}

			return reject();
		});
	}

	/**
	 * Gets all sockets for a specified session id
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.sessionId - user session id
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async SOCKETS_FROM_SESSION_ID(payload) {
		return new Promise(resolve => {
			const ns = IOModule._io.of("/");
			const sockets = [];

			if (ns) {
				return async.each(
					Object.keys(ns.connected),
					(id, next) => {
						const { session } = ns.connected[id];
						if (session.sessionId === payload.sessionId) sockets.push(session.sessionId);
						next();
					},
					() => {
						resolve({ sockets });
					}
				);
			}

			return resolve();
		});
	}

	/**
	 * Returns any sockets for a specific user
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.userId - the user id
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async SOCKETS_FROM_USER(payload) {
		return new Promise((resolve, reject) => {
			const ns = IOModule._io.of("/");
			const sockets = [];

			if (ns) {
				return async.each(
					Object.keys(ns.connected),
					(id, next) => {
						const { session } = ns.connected[id];
						CacheModule.runJob(
							"HGET",
							{
								table: "sessions",
								key: session.sessionId
							},
							this
						)
							.then(session => {
								if (session && session.userId === payload.userId) sockets.push(ns.connected[id]);
								next();
							})
							.catch(err => {
								next(err);
							});
					},
					err => {
						if (err) return reject(err);
						return resolve({ sockets });
					}
				);
			}

			return resolve();
		});
	}

	/**
	 * Returns any sockets from a specific ip address
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.ip - the ip address in question
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async SOCKETS_FROM_IP(payload) {
		return new Promise(resolve => {
			const ns = IOModule._io.of("/");
			const sockets = [];
			if (ns) {
				return async.each(
					Object.keys(ns.connected),
					(id, next) => {
						const { session } = ns.connected[id];
						CacheModule.runJob(
							"HGET",
							{
								table: "sessions",
								key: session.sessionId
							},
							this
						)
							.then(session => {
								if (session && ns.connected[id].ip === payload.ip) sockets.push(ns.connected[id]);
								next();
							})
							.catch(() => next());
					},
					() => {
						resolve({ sockets });
					}
				);
			}

			return resolve();
		});
	}

	/**
	 * Returns any sockets from a specific user without using redis/cache
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.userId - the id of the user in question
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async SOCKETS_FROM_USER_WITHOUT_CACHE(payload) {
		return new Promise(resolve => {
			const ns = IOModule._io.of("/");
			const sockets = [];

			if (ns) {
				return async.each(
					Object.keys(ns.connected),
					(id, next) => {
						const { session } = ns.connected[id];
						if (session.userId === payload.userId) sockets.push(ns.connected[id]);
						next();
					},
					() => {
						resolve({ sockets });
					}
				);
			}

			return resolve();
		});
	}

	/**
	 * Allows a socket to leave any rooms they are connected to
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.socketId - the id of the socket which should leave all their rooms
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async SOCKET_LEAVE_ROOMS(payload) {
		const socket = await IOModule.runJob(
			"SOCKET_FROM_SESSION",
			{
				socketId: payload.socketId
			},
			this
		);

		return new Promise(resolve => {
			const { rooms } = socket;

			Object.keys(rooms).forEach(roomKey => {
				const room = rooms[roomKey];
				socket.leave(room);
			});

			return resolve();
		});
	}

	/**
	 * Allows a socket to join a specified room
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.socketId - the id of the socket which should join the room
	 * @param {object} payload.room - the object representing the room the socket should join
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async SOCKET_JOIN_ROOM(payload) {
		const socket = await IOModule.runJob(
			"SOCKET_FROM_SESSION",
			{
				socketId: payload.socketId
			},
			this
		);

		return new Promise(resolve => {
			const { rooms } = socket;
			Object.keys(rooms).forEach(roomKey => {
				const room = rooms[roomKey];
				socket.leave(room);
			});

			socket.join(payload.room);

			return resolve();
		});
	}

	// UNKNOWN
	// eslint-disable-next-line require-jsdoc
	async SOCKET_JOIN_SONG_ROOM(payload) {
		// socketId, room
		const socket = await IOModule.runJob(
			"SOCKET_FROM_SESSION",
			{
				socketId: payload.socketId
			},
			this
		);

		return new Promise(resolve => {
			const { rooms } = socket;
			Object.keys(rooms).forEach(roomKey => {
				const room = rooms[roomKey];
				if (room.indexOf("song.") !== -1) socket.leave(room);
			});

			socket.join(payload.room);

			return resolve();
		});
	}

	// UNKNOWN
	// eslint-disable-next-line require-jsdoc
	SOCKETS_JOIN_SONG_ROOM(payload) {
		// sockets, room
		return new Promise(resolve => {
			Object.keys(payload.sockets).forEach(socketKey => {
				const socket = payload.sockets[socketKey];

				const { rooms } = socket;
				Object.keys(rooms).forEach(roomKey => {
					const room = rooms[roomKey];
					if (room.indexOf("song.") !== -1) socket.leave(room);
				});

				socket.join(payload.room);
			});

			return resolve();
		});
	}

	// UNKNOWN
	// eslint-disable-next-line require-jsdoc
	SOCKETS_LEAVE_SONG_ROOMS(payload) {
		// sockets
		return new Promise(resolve => {
			Object.keys(payload.sockets).forEach(socketKey => {
				const socket = payload.sockets[socketKey];
				const { rooms } = socket;
				Object.keys(rooms).forEach(roomKey => {
					const room = rooms[roomKey];
					if (room.indexOf("song.") !== -1) socket.leave(room);
				});
			});
			resolve();
		});
	}

	/**
	 * Emits arguments to any sockets that are in a specified a room
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.room - the name of the room to emit arguments
	 * @param {object} payload.args - any arguments to be emitted to the sockets in the specific room
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async EMIT_TO_ROOM(payload) {
		return new Promise(resolve => {
			const { sockets } = IOModule._io.sockets;
			Object.keys(sockets).forEach(socketKey => {
				const socket = sockets[socketKey];
				if (socket.rooms[payload.room]) {
					socket.emit(...payload.args);
				}
			});

			return resolve();
		});
	}

	/**
	 * Gets any sockets connected to a room
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.room - the name of the room
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async GET_ROOM_SOCKETS(payload) {
		return new Promise(resolve => {
			const { sockets } = IOModule._io.sockets;
			const roomSockets = [];
			Object.keys(sockets).forEach(socketKey => {
				const socket = sockets[socketKey];
				if (socket.rooms[payload.room]) roomSockets.push(socket);
			});

			return resolve(roomSockets);
		});
	}

	/**
	 * Handles io.use
	 *
	 * @param {object} payload - object that contains the payload
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async HANDLE_IO_USE(payload) {
		return new Promise(resolve => {
			const { socket, cb } = payload;

			let SID;

			socket.ip = socket.request.headers["x-forwarded-for"] || "0.0.0.0";

			return async.waterfall(
				[
					next => {
						UtilsModule.runJob(
							"PARSE_COOKIES",
							{
								cookieString: socket.request.headers.cookie
							},
							this
						).then(res => {
							SID = res[IOModule.SIDname];
							next(null);
						});
					},

					next => {
						if (!SID) return next("No SID.");
						return next();
					},

					next => {
						CacheModule.runJob("HGET", { table: "sessions", key: SID }, this)
							.then(session => {
								next(null, session);
							})
							.catch(next);
					},

					(session, next) => {
						if (!session) return next("No session found.");

						session.refreshDate = Date.now();

						socket.session = session;

						return CacheModule.runJob(
							"HSET",
							{
								table: "sessions",
								key: SID,
								value: session
							},
							this
						).then(session => {
							next(null, session);
						});
					},

					(res, next) => {
						// check if a session's user / IP is banned
						PunishmentsModule.runJob("GET_PUNISHMENTS", {}, this)
							.then(punishments => {
								const isLoggedIn = !!(socket.session && socket.session.refreshDate);
								const userId = isLoggedIn ? socket.session.userId : null;

								const banishment = {
									banned: false,
									ban: 0
								};

								punishments.forEach(punishment => {
									if (punishment.expiresAt > banishment.ban) banishment.ban = punishment;
									if (punishment.type === "banUserId" && isLoggedIn && punishment.value === userId)
										banishment.banned = true;
									if (punishment.type === "banUserIp" && punishment.value === socket.ip)
										banishment.banned = true;
								});

								socket.banishment = banishment;

								next();
							})
							.catch(() => {
								next();
							});
					}
				],
				() => {
					if (!socket.session) socket.session = { socketId: socket.id };
					else socket.session.socketId = socket.id;

					cb();
					resolve();
				}
			);
		});
	}

	/**
	 * Handles io.connection
	 *
	 * @param {object} payload - object that contains the payload
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async HANDLE_IO_CONNECTION(payload) {
		return new Promise(resolve => {
			const { socket } = payload;

			let sessionInfo = "";

			if (socket.session.sessionId) sessionInfo = ` UserID: ${socket.session.userId}.`;

			// if session is banned
			if (socket.banishment && socket.banishment.banned) {
				IOModule.log(
					"INFO",
					"IO_BANNED_CONNECTION",
					`A user tried to connect, but is currently banned. IP: ${socket.ip}.${sessionInfo}`
				);

				socket.emit("keep.event:banned", socket.banishment.ban);

				return socket.disconnect(true);
			}

			IOModule.log("INFO", "IO_CONNECTION", `User connected. IP: ${socket.ip}.${sessionInfo}`);

			// catch when the socket has been disconnected
			socket.on("disconnect", () => {
				if (socket.session.sessionId) sessionInfo = ` UserID: ${socket.session.userId}.`;
				IOModule.log("INFO", "IO_DISCONNECTION", `User disconnected. IP: ${socket.ip}.${sessionInfo}`);
			});

			socket.use((data, next) => {
				if (data.length === 0) return next(new Error("Not enough arguments specified."));
				if (typeof data[0] !== "string") return next(new Error("First argument must be a string."));

				const namespaceAction = data[0];
				if (
					!namespaceAction ||
					namespaceAction.indexOf(".") === -1 ||
					namespaceAction.indexOf(".") !== namespaceAction.lastIndexOf(".")
				)
					return next(new Error("Invalid first argument"));
				const namespace = data[0].split(".")[0];
				const action = data[0].split(".")[1];

				if (!namespace) return next(new Error("Invalid namespace."));
				if (!action) return next(new Error("Invalid action."));
				if (!IOModule.actions[namespace]) return next(new Error("Namespace not found."));
				if (!IOModule.actions[namespace][action]) return next(new Error("Action not found."));

				return next();
			});

			// catch errors on the socket (internal to socket.io)
			socket.on("error", console.error);

			if (socket.session.sessionId) {
				CacheModule.runJob("HGET", {
					table: "sessions",
					key: socket.session.sessionId
				})
					.then(session => {
						if (session && session.userId) {
							IOModule.userModel.findOne({ _id: session.userId }, (err, user) => {
								if (err || !user) return socket.emit("ready", false);

								let role = "";
								let username = "";
								let userId = "";
								if (user) {
									role = user.role;
									username = user.username;
									userId = session.userId;
								}

								return socket.emit("ready", true, role, username, userId);
							});
						} else socket.emit("ready", false);
					})
					.catch(() => {
						socket.emit("ready", false);
					});
			} else socket.emit("ready", false);

			// have the socket listen for each action
			Object.keys(IOModule.actions).forEach(namespace => {
				Object.keys(IOModule.actions[namespace]).forEach(action => {
					// the full name of the action
					const name = `${namespace}.${action}`;

					// listen for this action to be called
					socket.on(name, async (...args) => {
						IOModule.runJob("RUN_ACTION", { socket, namespace, action, args });

						/* let cb = args[args.length - 1];

						if (typeof cb !== "function")
							cb = () => {
								IOModule.log("INFO", "IO_MODULE", `There was no callback provided for ${name}.`);
							};
						else args.pop();

						if (this.getStatus() !== "READY") {
							IOModule.log(
								"INFO",
								"IO_REJECTED_ACTION",
								`A user tried to execute an action, but the IO module is currently not ready. Action: ${namespace}.${action}.`
							);
							return;
						}
						IOModule.log("INFO", "IO_ACTION", `A user executed an action. Action: ${namespace}.${action}.`);

						let failedGettingSession = false;
						// load the session from the cache
						if (socket.session.sessionId)
							await CacheModule.runJob("HGET", {
								table: "sessions",
								key: socket.session.sessionId
							})
								.then(session => {
									// make sure the sockets sessionId isn't set if there is no session
									if (socket.session.sessionId && session === null) delete socket.session.sessionId;
								})
								.catch(() => {
									failedGettingSession = true;
									if (typeof cb === "function")
										cb({
											status: "error",
											message: "An error occurred while obtaining your session"
										});
								});
						if (!failedGettingSession)
							try {
								// call the action, passing it the session, and the arguments socket.io passed us
								this.runJob("RUN_ACTION", { namespace, action, session: socket.session, args })
									.then(response => {
										if (typeof cb === "function") cb(response);
									})
									.catch(err => {
										if (typeof cb === "function") cb(err);
									});
								// actions[namespace][action].apply(
								// 	null,
								// 	[socket.session].concat(args).concat([
								// 		result => {
								// 			IOModule.log(
								// 				"INFO",
								// 				"IO_ACTION",
								// 				`Response to action. Action: ${namespace}.${action}. Response status: ${result.status}`
								// 			);
								// 			// respond to the socket with our message
								// 			if (typeof cb === "function") cb(result);
								// 		}
								// 	])
								// );
							} catch (err) {
								if (typeof cb === "function")
									cb({
										status: "error",
										message: "An error occurred while executing the specified action."
									});

								IOModule.log(
									"ERROR",
									"IO_ACTION_ERROR",
									`Some type of exception occurred in the action ${namespace}.${action}. Error message: ${err.message}`
								);
							} */
					});
				});
			});

			return resolve();
		});
	}

	/**
	 * Runs an action
	 *
	 * @param {object} payload - object that contains the payload
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async RUN_ACTION(payload) {
		return new Promise((resolve, reject) => {
			const { socket, namespace, action, args } = payload;

			// the full name of the action
			const name = `${namespace}.${action}`;

			let cb = args[args.length - 1];
			if (typeof cb !== "function")
				cb = () => {
					IOModule.log("INFO", "IO_MODULE", `There was no callback provided for ${name}.`);
				};
			else args.pop();

			IOModule.log("INFO", "IO_ACTION", `A user executed an action. Action: ${namespace}.${action}.`);

			// load the session from the cache
			new Promise(resolve => {
				if (socket.session.sessionId)
					CacheModule.runJob("HGET", {
						table: "sessions",
						key: socket.session.sessionId
					})
						.then(session => {
							// make sure the sockets sessionId isn't set if there is no session
							if (socket.session.sessionId && session === null) delete socket.session.sessionId;
							resolve();
						})
						.catch(() => {
							if (typeof cb === "function")
								cb({
									status: "error",
									message: "An error occurred while obtaining your session"
								});
							reject(new Error("An error occurred while obtaining the session"));
						});
			})
				.then(() => {
					// call the job that calls the action, passing it the session, and the arguments socket.io passed us

					IOModule.runJob("RUN_ACTION2", { session: socket.session, namespace, action, args })
						.then(response => {
							cb(response);
						})
						.catch(err => {
							if (typeof cb === "function")
								cb({
									status: "error",
									message: "An error occurred while executing the specified action."
								});
							reject(err);

							IOModule.log(
								"ERROR",
								"IO_ACTION_ERROR",
								`Some type of exception occurred in the action ${namespace}.${action}. Error message: ${err.message}`
							);
						});
				})
				.catch(reject);
		});
	}

	/**
	 * Runs an action
	 *
	 * @param {object} payload - object that contains the payload
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async RUN_ACTION2(payload) {
		return new Promise((resolve, reject) => {
			const { session, namespace, action, args } = payload;

			try {
				// call the the action, passing it the session, and the arguments socket.io passed us
				IOModule.actions[namespace][action].apply(
					this,
					[session].concat(args).concat([
						result => {
							IOModule.log(
								"INFO",
								"RUN_ACTION2",
								`Response to action. Action: ${namespace}.${action}. Response status: ${result.status}`
							);
							resolve(result);
						}
					])
				);
			} catch (err) {
				reject(err);

				IOModule.log(
					"ERROR",
					"IO_ACTION_ERROR",
					`Some type of exception occurred in the action ${namespace}.${action}. Error message: ${err.message}`
				);
			}
		});
	}
}

export default new _IOModule();
