/**
 * @file
 */

import config from "config";
import async from "async";
import WebSocket from "ws";
import { EventEmitter } from "events";

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

		// this._io.origins(config.get("cors.origin"));

		this._io = new WebSocket.Server({ server, path: "/ws" });

		this.rooms = {};

		return new Promise(resolve => {
			this.setStage(3);

			this.setStage(4);

			this._io.on("connection", async (socket, req) => {
				socket.dispatch = (...args) => socket.send(JSON.stringify(args));

				socket.actions = new EventEmitter();
				socket.actions.setMaxListeners(0);
				socket.listen = (target, cb) => socket.actions.addListener(target, args => cb(args));

				IOModule.runJob("HANDLE_IO_USE", { socket, req }).then(socket =>
					IOModule.runJob("HANDLE_IO_CONNECTION", { socket })
				);
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
	 * Obtains socket object for a specified socket id
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.socketId - the id of the socket
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async SOCKET_FROM_SOCKET_ID(payload) {
		return new Promise((resolve, reject) => {
			const { clients } = IOModule._io;

			if (clients) {
				return clients.forEach(socket => {
					if (socket.session.socketId === payload.socketId) resolve(socket);
				});
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
			const { clients } = IOModule._io;
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
				IOModule._io.clients,
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
			const { clients } = IOModule._io;

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
			const { clients } = IOModule._io;
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
			Object.keys(IOModule.rooms).forEach(room => {
				IOModule.rooms[room] = IOModule.rooms[room].filter(participant => participant !== payload.socketId);
			});

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

		// leave all other rooms
		await IOModule.runJob("SOCKET_LEAVE_ROOMS", { socketId }, this);

		return new Promise(resolve => {
			// create room if it doesn't exist, and add socketId to array
			if (IOModule.rooms[room]) IOModule.rooms[room].push(socketId);
			else IOModule.rooms[room] = [socketId];

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
			if (IOModule.rooms[payload.room])
				return IOModule.rooms[payload.room].forEach(async socketId => {
					const socket = await IOModule.runJob("SOCKET_FROM_SOCKET_ID", { socketId }, this);
					socket.dispatch(...payload.args);
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
		await IOModule.runJob("SOCKETS_LEAVE_SONG_ROOMS", { sockets: [socketId] }, this);

		return new Promise(resolve => {
			// join the room
			if (IOModule.rooms[room]) IOModule.rooms[room].push(socketId);
			else IOModule.rooms[room] = [socketId];

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
			payload.sockets.forEach(socketId => IOModule.runJob("SOCKET_JOIN_SONG_ROOM", { socketId }, this));
			return resolve();
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
		return new Promise(resolve => {
			payload.sockets.forEach(async socketId => {
				const rooms = await IOModule.runJob("GET_ROOMS_FOR_SOCKET", { socketId }, this);

				rooms.forEach(room => {
					if (room.indexOf("song.") !== -1)
						IOModule.rooms[room] = IOModule.rooms[room].filter(
							participant => participant !== payload.socketId
						);
				});
			});

			resolve();
		});
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
			if (IOModule.rooms[payload.room]) return resolve(IOModule.rooms[payload.room]);
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

			Object.keys(IOModule.rooms).forEach(room => {
				if (IOModule.rooms[room].includes(payload.socketId)) rooms.push(room);
			});

			return resolve(rooms);
		});
	}

	/**
	 * Handles io.use
	 *
	 * @param {object} payload - object that contains the payload
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async HANDLE_IO_USE(payload) {
		console.log("io use");

		return new Promise(resolve => {
			const { socket, req } = payload;

			let SID;

			socket.ip = req.headers["x-forwarded-for"] || "0.0.0.0";

			return async.waterfall(
				[
					next => {
						if (!req.headers.cookie) return next("No cookie exists yet.");
						return UtilsModule.runJob("PARSE_COOKIES", { cookieString: req.headers.cookie }, this).then(
							res => {
								SID = res[IOModule.SIDname];
								next(null);
							}
						);
					},

					next => {
						if (!SID) return next("No SID.");
						return next();
					},

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
							.catch(() => {
								next();
							});
					}
				],
				() => {
					if (!socket.session) socket.session = { socketId: req.headers["sec-websocket-key"] };
					else socket.session.socketId = req.headers["sec-websocket-key"];

					// cb();
					resolve(socket);
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
		console.log("handle io connection");

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

				socket.dispatch("keep.event:banned", socket.banishment.ban);

				return socket.disconnect(true); // doesn't work - need to fix
			}

			IOModule.log("INFO", "IO_CONNECTION", `User connected. IP: ${socket.ip}.${sessionInfo}`);

			// catch when the socket has been disconnected
			socket.on("close", async () => {
				if (socket.session.sessionId) sessionInfo = ` UserID: ${socket.session.userId}.`;
				IOModule.log("INFO", "IO_DISCONNECTION", `User disconnected. IP: ${socket.ip}.${sessionInfo}`);

				await IOModule.runJob("SOCKET_LEAVE_ROOMS", { socketId: socket.session.socketId });
			});

			// socket.use((data, next) => {
			// 	if (data.length === 0) return next(new Error("Not enough arguments specified."));
			// 	if (typeof data[0] !== "string") return next(new Error("First argument must be a string."));

			// 	const namespaceAction = data[0];
			// 	if (
			// 		!namespaceAction ||
			// 		namespaceAction.indexOf(".") === -1 ||
			// 		namespaceAction.indexOf(".") !== namespaceAction.lastIndexOf(".")
			// 	)
			// 		return next(new Error("Invalid first argument"));
			// 	const namespace = data[0].split(".")[0];
			// 	const action = data[0].split(".")[1];

			// 	if (!namespace) return next(new Error("Invalid namespace."));
			// 	if (!action) return next(new Error("Invalid action."));
			// 	if (!IOModule.actions[namespace]) return next(new Error("Namespace not found."));
			// 	if (!IOModule.actions[namespace][action]) return next(new Error("Action not found."));

			// 	return next();
			// });

			// catch errors on the socket (internal to socket.io)
			socket.onerror = console.error; // need to update

			if (socket.session.sessionId) {
				CacheModule.runJob("HGET", {
					table: "sessions",
					key: socket.session.sessionId
				})
					.then(session => {
						if (session && session.userId) {
							IOModule.userModel.findOne({ _id: session.userId }, (err, user) => {
								if (err || !user) return socket.dispatch("ready", false);

								let role = "";
								let username = "";
								let userId = "";
								if (user) {
									role = user.role;
									username = user.username;
									userId = session.userId;
								}

								return socket.dispatch("ready", true, role, username, userId);
							});
						} else socket.dispatch("ready", false);
					})
					.catch(() => {
						socket.dispatch("ready", false);
					});
			} else socket.dispatch("ready", false);

			// have the socket listen for each action
			Object.keys(IOModule.actions).forEach(namespace => {
				Object.keys(IOModule.actions[namespace]).forEach(action => {
					// the full name of the action
					const name = `${namespace}.${action}`;

					socket.onmessage = message => {
						const data = JSON.parse(message.data);

						if (data[data.length - 1].callbackRef) {
							const { callbackRef } = data[data.length - 1];
							data.pop();
							return socket.actions.emit(data.shift(0), [
								...data,
								res => socket.dispatch("callbackRef", callbackRef, res)
							]);
						}

						return socket.actions.emit(data.shift(0), data);
					};

					// listen for this action to be called
					socket.listen(name, async args =>
						IOModule.runJob("RUN_ACTION", { socket, namespace, action, args })
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
				else resolve();
			})
				.then(() => {
					// call the job that calls the action, passing it the session, and the arguments socket.io passed us

					IOModule.runJob("RUN_ACTION2", { session: socket.session, namespace, action, args }, this)
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
