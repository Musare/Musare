/**
 * @file
 */

import config from "config";
import async from "async";
import WebSocket from "ws";
import { EventEmitter } from "events";

import CoreClass from "../core";

let WSModule;
let AppModule;
let CacheModule;
let UtilsModule;
let DBModule;
let PunishmentsModule;

class _WSModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("ws");

		WSModule = this;
	}

	/**
	 * Initialises the ws module
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

		// this._io.origins(config.get("cors.origin"));

		this._io = new WebSocket.Server({ server, path: "/ws" });

		this.rooms = {};

		return new Promise(resolve => {
			this.setStage(3);

			this._io.on("connection", async (socket, req) => {
				socket.dispatch = (...args) => socket.send(JSON.stringify(args));

				socket.actions = new EventEmitter();
				socket.actions.setMaxListeners(0);
				socket.listen = (target, cb) => socket.actions.addListener(target, args => cb(args));

				WSModule.runJob("HANDLE_WS_USE", { socket, req }).then(socket =>
					WSModule.runJob("HANDLE_WS_CONNECTION", { socket })
				);

				socket.isAlive = true;
				socket.on("pong", function heartbeat() {
					this.isAlive = true;
				});
			});

			const keepAliveInterval = setInterval(() => {
				this._io.clients.forEach(socket => {
					if (socket.isAlive === false) return socket.terminate();

					socket.isAlive = false;
					return socket.ping(() => {});
				});
			}, 45000);

			this._io.on("close", () => clearInterval(keepAliveInterval));

			this.setStage(4);

			return resolve();
		});
	}

	/**
	 * Returns the websockets variable
	 *
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	WS() {
		return new Promise(resolve => resolve(WSModule._io));
	}

	/**
	 * Obtains socket object for a specified socket id
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.socketId - the id of the socket
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async SOCKET_FROM_SOCKET_ID(payload) {
		return new Promise(resolve => {
			const { clients } = WSModule._io;

			if (clients)
				// eslint-disable-next-line consistent-return
				clients.forEach(socket => {
					if (socket.session.socketId === payload.socketId) return resolve(socket);
				});

			// socket doesn't exist
			return resolve();
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
			const { clients } = WSModule._io;
			const sockets = [];

			if (clients) {
				return async.each(
					Object.keys(clients),
					(id, next) => {
						const { session } = clients[id];
						if (session.sessionId === payload.sessionId) sockets.push(session.sessionId);
						next();
					},
					() => resolve(sockets)
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
			const sockets = [];

			return async.eachLimit(
				WSModule._io.clients,
				1,
				(socket, next) => {
					const { sessionId } = socket.session;

					if (sessionId) {
						return CacheModule.runJob("HGET", { table: "sessions", key: sessionId }, this)
							.then(session => {
								if (session && session.userId === payload.userId) sockets.push(socket);
								next();
							})
							.catch(err => next(err));
					}

					return next();
				},
				err => {
					if (err) return reject(err);
					return resolve(sockets);
				}
			);
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
			const { clients } = WSModule._io;

			const sockets = [];

			return async.each(
				Object.keys(clients),
				(id, next) => {
					const { session } = clients[id];

					CacheModule.runJob("HGET", { table: "sessions", key: session.sessionId }, this)
						.then(session => {
							if (session && clients[id].ip === payload.ip) sockets.push(clients[id]);
							next();
						})
						.catch(() => next());
				},
				() => resolve(sockets)
			);
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
			const { clients } = WSModule._io;
			const sockets = [];

			if (clients) {
				return async.each(
					Object.keys(clients),
					(id, next) => {
						const { session } = clients[id];
						if (session.userId === payload.userId) sockets.push(clients[id]);
						next();
					},
					() => resolve(sockets)
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
		return new Promise(resolve => {
			// filter out rooms that the user is in
			Object.keys(WSModule.rooms).forEach(room => {
				WSModule.rooms[room] = WSModule.rooms[room].filter(participant => participant !== payload.socketId);
			});

			return resolve();
		});
	}

	/**
	 * Allows a socket to leave a specific room they are connected to
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.socketId - the id of the socket which should leave a room
	 * @param {string} payload.room - the room
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	 async SOCKET_LEAVE_ROOM(payload) {
		return new Promise(resolve => {
			// filter out rooms that the user is in
			if (WSModule.rooms[payload.room]) WSModule.rooms[payload.room] = WSModule.rooms[payload.room].filter(participant => participant !== payload.socketId);

			return resolve();
		});
	}

	/**
	 * Allows a socket to join a specified room (this will remove them from any rooms they are currently in)
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.socketId - the id of the socket which should join the room
	 * @param {string} payload.room - the name of the room
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async SOCKET_JOIN_ROOM(payload) {
		const { room, socketId } = payload;
		return new Promise(resolve => {
			// create room if it doesn't exist, and add socketId to array
			if (WSModule.rooms[room]) WSModule.rooms[room].push(socketId);
			else WSModule.rooms[room] = [socketId];

			return resolve();
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
			// if the room exists
			if (WSModule.rooms[payload.room] && WSModule.rooms[payload.room].length > 0)
				return WSModule.rooms[payload.room].forEach(async socketId => {
					// get every socketId (and thus every socket) in the room, and dispatch to each
					const socket = await WSModule.runJob("SOCKET_FROM_SOCKET_ID", { socketId }, this);
					socket.dispatch(...payload.args);
					return resolve();
				});

			return resolve();
		});
	}

	/**
	 * Allows a socket to join a 'song' room
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.socketId - the id of the socket which should join the room
	 * @param {string} payload.room - the name of the room
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async SOCKET_JOIN_SONG_ROOM(payload) {
		const { room, socketId } = payload;

		// leave any other song rooms the user is in
		await WSModule.runJob("SOCKETS_LEAVE_SONG_ROOMS", { sockets: [socketId] }, this);

		return new Promise(resolve => {
			// join the room
			if (WSModule.rooms[room]) WSModule.rooms[room].push(socketId);
			else WSModule.rooms[room] = [socketId];

			return resolve();
		});
	}

	/**
	 * Allows multiple sockets to join a 'song' room
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {Array} payload.sockets - array of socketIds
	 * @param {object} payload.room - the name of the room
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	SOCKETS_JOIN_SONG_ROOM(payload) {
		return new Promise(resolve => {
			Promise.allSettled(
				payload.sockets.map(async socketId => {
					await WSModule.runJob("SOCKET_JOIN_SONG_ROOM", { socketId, room: payload.room }, this);
				})
			).then(() => resolve());
		});
	}

	/**
	 * Allows multiple sockets to leave any 'song' rooms they are in
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {Array} payload.sockets - array of socketIds
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	SOCKETS_LEAVE_SONG_ROOMS(payload) {
		return new Promise(resolve =>
			Promise.allSettled(
				payload.sockets.map(async socketId => {
					const rooms = await WSModule.runJob("GET_ROOMS_FOR_SOCKET", { socketId }, this);

					rooms.forEach(room => {
						if (room.indexOf("song.") !== -1)
							WSModule.rooms[room] = WSModule.rooms[room].filter(participant => participant !== socketId);
					});
				})
			).then(() => resolve())
		);
	}

	/**
	 * Gets any sockets connected to a room
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.room - the name of the room
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async GET_SOCKETS_FOR_ROOM(payload) {
		return new Promise(resolve => {
			if (WSModule.rooms[payload.room]) return resolve(WSModule.rooms[payload.room]);
			return resolve([]);
		});
	}

	/**
	 * Gets any rooms a socket is connected to
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.socketId - the id of the socket to check the rooms for
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async GET_ROOMS_FOR_SOCKET(payload) {
		return new Promise(resolve => {
			const rooms = [];

			Object.keys(WSModule.rooms).forEach(room => {
				if (WSModule.rooms[room].includes(payload.socketId)) rooms.push(room);
			});

			return resolve(rooms);
		});
	}

	/**
	 * Handles use of websockets
	 *
	 * @param {object} payload - object that contains the payload
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async HANDLE_WS_USE(payload) {
		return new Promise(resolve => {
			const { socket, req } = payload;
			let SID = "";

			socket.ip = req.headers["x-forwarded-for"] || "0..0.0";

			return async.waterfall(
				[
					next => {
						if (!req.headers.cookie) return next("No cookie exists yet.");
						return UtilsModule.runJob("PARSE_COOKIES", { cookieString: req.headers.cookie }, this).then(
							res => {
								SID = res[WSModule.SIDname];
								next(null);
							}
						);
					},

					next => {
						if (!SID) return next("No SID.");
						return next();
					},

					// see if session exists for cookie
					next => {
						CacheModule.runJob("HGET", { table: "sessions", key: SID }, this)
							.then(session => next(null, session))
							.catch(next);
					},

					(session, next) => {
						if (!session) return next("No session found.");

						session.refreshDate = Date.now();

						socket.session = session;

						return CacheModule.runJob(
							"HSET",
							{ table: "sessions", key: SID, value: session },
							this
						).then(session => next(null, session));
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
							.catch(() => next());
					}
				],
				() => {
					if (!socket.session) socket.session = { socketId: req.headers["sec-websocket-key"] };
					else socket.session.socketId = req.headers["sec-websocket-key"];

					resolve(socket);
				}
			);
		});
	}

	/**
	 * Handles a websocket connection
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.socket - socket itself
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async HANDLE_WS_CONNECTION(payload) {
		return new Promise(resolve => {
			const { socket } = payload;

			let sessionInfo = "";
			if (socket.session.sessionId) sessionInfo = ` UserID: ${socket.session.userId}.`;

			// if session is banned
			if (socket.banishment && socket.banishment.banned) {
				WSModule.log(
					"INFO",
					"IO_BANNED_CONNECTION",
					`A user tried to connect, but is currently banned. IP: ${socket.ip}.${sessionInfo}`
				);

				socket.dispatch("keep.event:banned", { data: { ban: socket.banishment.ban } });

				return socket.close(); // close socket connection
			}

			WSModule.log("INFO", "IO_CONNECTION", `User connected. IP: ${socket.ip}.${sessionInfo}`);

			// catch when the socket has been disconnected
			socket.on("close", async () => {
				if (socket.session.sessionId) sessionInfo = ` UserID: ${socket.session.userId}.`;
				WSModule.log("INFO", "IO_DISCONNECTION", `User disconnected. IP: ${socket.ip}.${sessionInfo}`);

				// leave all rooms when a socket connection is closed (to prevent rooms object building up)
				await WSModule.runJob("SOCKET_LEAVE_ROOMS", { socketId: socket.session.socketId });
			});

			// catch errors on the socket
			socket.onerror = error => {
				console.error("SOCKET ERROR: ", error);
			};

			if (socket.session.sessionId) {
				CacheModule.runJob("HGET", {
					table: "sessions",
					key: socket.session.sessionId
				})
					.then(session => {
						if (session && session.userId) {
							WSModule.userModel.findOne({ _id: session.userId }, (err, user) => {
								if (err || !user) return socket.dispatch("ready", { data: { loggedIn: false } });

								let role = "";
								let username = "";
								let userId = "";
								let email = "";

								if (user) {
									role = user.role;
									username = user.username;
									email = user.email.address;
									userId = session.userId;
								}

								return socket.dispatch("ready", {
									data: { loggedIn: true, role, username, userId, email }
								});
							});
						} else socket.dispatch("ready", { data: { loggedIn: false } });
					})
					.catch(() => socket.dispatch("ready", { data: { loggedIn: false } }));
			} else socket.dispatch("ready", { data: { loggedIn: false } });

			socket.onmessage = message => {
				const data = JSON.parse(message.data);

				if (data.length === 0) return socket.dispatch("ERROR", "Not enough arguments specified.");
				if (typeof data[0] !== "string") return socket.dispatch("ERROR", "First argument must be a string.");

				const namespaceAction = data[0];
				if (
					!namespaceAction ||
					namespaceAction.indexOf(".") === -1 ||
					namespaceAction.indexOf(".") !== namespaceAction.lastIndexOf(".")
				)
					return socket.dispatch("ERROR", "Invalid first argument");

				const namespace = data[0].split(".")[0];
				const action = data[0].split(".")[1];

				if (!namespace) return socket.dispatch("ERROR", "Invalid namespace.");
				if (!action) return socket.dispatch("ERROR", "Invalid action.");
				if (!WSModule.actions[namespace]) return socket.dispatch("ERROR", "Namespace not found.");
				if (!WSModule.actions[namespace][action]) return socket.dispatch("ERROR", "Action not found.");

				if (data[data.length - 1].CB_REF) {
					const { CB_REF } = data[data.length - 1];
					data.pop();

					return socket.actions.emit(data.shift(0), [...data, res => socket.dispatch("CB_REF", CB_REF, res)]);
				}

				return socket.actions.emit(data.shift(0), data);
			};

			// have the socket listen for each action
			Object.keys(WSModule.actions).forEach(namespace => {
				Object.keys(WSModule.actions[namespace]).forEach(action => {
					// the full name of the action
					const name = `${namespace}.${action}`;

					// listen for this action to be called
					socket.listen(name, async args =>
						WSModule.runJob("RUN_ACTION", { socket, namespace, action, args })
					);
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
					WSModule.log("INFO", "IO_MODULE", `There was no callback provided for ${name}.`);
				};
			else args.pop();

			WSModule.log("INFO", "IO_ACTION", `A user executed an action. Action: ${namespace}.${action}.`);

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
				else resolve();
			})
				.then(() => {
					// call the job that calls the action, passing it the session, and the arguments the websocket passed us

					WSModule.runJob("RUN_ACTION2", { session: socket.session, namespace, action, args }, this)
						.then(response => {
							cb(response);
							resolve();
						})
						.catch(err => {
							if (typeof cb === "function")
								cb({
									status: "error",
									message: "An error occurred while executing the specified action."
								});

							reject(err);

							WSModule.log(
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
				// call the the action, passing it the session, and the arguments the websocket passed us
				WSModule.actions[namespace][action].apply(
					this,
					[session].concat(args).concat([
						result => {
							WSModule.log(
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

				WSModule.log(
					"ERROR",
					"IO_ACTION_ERROR",
					`Some type of exception occurred in the action ${namespace}.${action}. Error message: ${err.message}`
				);
			}
		});
	}
}

export default new _WSModule();
