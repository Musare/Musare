import async from "async";
import crypto from "crypto";
import CoreClass from "../core";

let UtilsModule;
let IOModule;
let CacheModule;

class _UtilsModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("utils");

		this.youtubeRequestCallbacks = [];
		this.youtubeRequestsPending = 0;
		this.youtubeRequestsActive = false;

		UtilsModule = this;
	}

	/**
	 * Initialises the utils module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	initialize() {
		return new Promise(resolve => {
			IOModule = this.moduleManager.modules.io;
			CacheModule = this.moduleManager.modules.cache;

			resolve();
		});
	}

	/**
	 * Parses the cookie into a readable object
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.cookieString - the cookie string
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	PARSE_COOKIES(payload) {
		return new Promise((resolve, reject) => {
			const cookies = {};

			if (typeof payload.cookieString !== "string") return reject(new Error("Cookie string is not a string"));

			// eslint-disable-next-line array-callback-return
			payload.cookieString.split("; ").map(cookie => {
				cookies[cookie.substring(0, cookie.indexOf("="))] = cookie.substring(
					cookie.indexOf("=") + 1,
					cookie.length
				);
			});

			return resolve(cookies);
		});
	}

	// COOKIES_TO_STRING() {//cookies
	// 	return new Promise((resolve, reject) => {
	//         let newCookie = [];
	//         for (let prop in cookie) {
	//             newCookie.push(prop + "=" + cookie[prop]);
	//         }
	//         return newCookie.join("; ");
	//     });
	// }

	/**
	 * Removes a cookie by name
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.cookieString - the cookie string
	 * @param {string} payload.cookieName - the unique name of the cookie
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	REMOVE_COOKIE(payload) {
		return new Promise((resolve, reject) => {
			let cookies;

			try {
				cookies = UtilsModule.runJob(
					"PARSE_COOKIES",
					{
						cookieString: payload.cookieString
					},
					this
				);
			} catch (err) {
				return reject(err);
			}

			delete cookies[payload.cookieName];

			return resolve();
		});
	}

	/**
	 * Replaces any html reserved characters in a string with html entities
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.str - the string to replace characters with html entities
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	HTML_ENTITIES(payload) {
		return new Promise(resolve => {
			resolve(
				String(payload.str)
					.replace(/&/g, "&amp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;")
					.replace(/"/g, "&quot;")
			);
		});
	}

	/**
	 * Generates a random string of a specified length
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {number} payload.length - the length the random string should be
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async GENERATE_RANDOM_STRING(payload) {
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");

		const promises = [];
		for (let i = 0; i < payload.length; i += 1) {
			promises.push(
				UtilsModule.runJob(
					"GET_RANDOM_NUMBER",
					{
						min: 0,
						max: chars.length - 1
					},
					this
				)
			);
		}

		const randomNums = await Promise.all(promises);

		const randomChars = [];
		for (let i = 0; i < payload.length; i += 1) {
			randomChars.push(chars[randomNums[i]]);
		}

		return new Promise(resolve => resolve(randomChars.join("")));
	}

	/**
	 * Returns a socket object from a socket identifier
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.socketId - the socket id
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async GET_SOCKET_FROM_ID(payload) {
		// socketId
		const io = await IOModule.runJob("IO", {}, this);

		return new Promise(resolve => resolve(io.sockets.sockets[payload.socketId]));
	}

	/**
	 * Creates a random number within a range
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {number} payload.min - the minimum number the result should be
	 * @param {number} payload.max - the maximum number the result should be
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_RANDOM_NUMBER(payload) {
		// min, max
		return new Promise(resolve =>
			resolve(Math.floor(Math.random() * (payload.max - payload.min + 1)) + payload.min)
		);
	}

	/**
	 * Converts ISO8601 time format (YouTube API) to HH:MM:SS
	 *
	 * @param  {object} payload - object contaiing the payload
	 * @param {string} payload.duration - string in the format of ISO8601
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	CONVERT_TIME(payload) {
		// duration
		return new Promise(resolve => {
			let { duration } = payload;
			let a = duration.match(/\d+/g);

			if (duration.indexOf("M") >= 0 && duration.indexOf("H") === -1 && duration.indexOf("S") === -1) {
				a = [0, a[0], 0];
			}

			if (duration.indexOf("H") >= 0 && duration.indexOf("M") === -1) {
				a = [a[0], 0, a[1]];
			}
			if (duration.indexOf("H") >= 0 && duration.indexOf("M") === -1 && duration.indexOf("S") === -1) {
				a = [a[0], 0, 0];
			}

			duration = 0;

			if (a.length === 3) {
				duration += parseInt(a[0]) * 3600;
				duration += parseInt(a[1]) * 60;
				duration += parseInt(a[2]);
			}

			if (a.length === 2) {
				duration += parseInt(a[0]) * 60;
				duration += parseInt(a[1]);
			}

			if (a.length === 1) {
				duration += parseInt(a[0]);
			}

			const hours = Math.floor(duration / 3600);
			const minutes = Math.floor((duration % 3600) / 60);
			const seconds = Math.floor((duration % 3600) % 60);

			resolve(
				(hours < 10 ? `0${hours}:` : `${hours}:`) +
					(minutes < 10 ? `0${minutes}:` : `${minutes}:`) +
					(seconds < 10 ? `0${seconds}` : seconds)
			);
		});
	}

	/**
	 * Creates a random identifier for e.g. sessionId
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GUID() {
		return new Promise(resolve => {
			resolve(
				[1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1]
					.map(b =>
						b
							? Math.floor((1 + Math.random()) * 0x10000)
									.toString(16)
									.substring(1)
							: "-"
					)
					.join("")
			);
		});
	}

	// UNKNOWN
	// eslint-disable-next-line require-jsdoc
	async SOCKET_FROM_SESSION(payload) {
		// socketId
		const io = await IOModule.runJob("IO", {}, this);

		return new Promise((resolve, reject) => {
			const ns = io.of("/");
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
		const io = await IOModule.runJob("IO", {}, this);

		return new Promise(resolve => {
			const ns = io.of("/");
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
		const io = await IOModule.runJob("IO", {}, this);

		return new Promise((resolve, reject) => {
			const ns = io.of("/");
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
		const io = await IOModule.runJob("IO", {}, this);

		return new Promise(resolve => {
			const ns = io.of("/");
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
		const io = await IOModule.runJob("IO", {}, this);

		return new Promise(resolve => {
			const ns = io.of("/");
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
		const socket = await UtilsModule.runJob(
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
		const socket = await UtilsModule.runJob(
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
		const socket = await UtilsModule.runJob(
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
		const io = await IOModule.runJob("IO", {}, this);

		return new Promise(resolve => {
			const { sockets } = io.sockets;
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
		const io = await IOModule.runJob("IO", {}, this);

		return new Promise(resolve => {
			const { sockets } = io.sockets;
			const roomSockets = [];
			Object.keys(sockets).forEach(socketKey => {
				const socket = sockets[socketKey];
				if (socket.rooms[payload.room]) roomSockets.push(socket);
			});

			return resolve(roomSockets);
		});
	}

	/**
	 * Shuffles an array of songs
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.array - an array of songs that should be shuffled
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	SHUFFLE(payload) {
		// array
		return new Promise(resolve => {
			const array = payload.array.slice();

			let currentIndex = payload.array.length;
			let temporaryValue;
			let randomIndex;

			// While there remain elements to shuffle...
			while (currentIndex !== 0) {
				// Pick a remaining element...
				randomIndex = Math.floor(Math.random() * currentIndex);
				currentIndex -= 1;

				// And swap it with the current element.
				temporaryValue = array[currentIndex];
				array[currentIndex] = array[randomIndex];
				array[randomIndex] = temporaryValue;
			}

			resolve({ array });
		});
	}

	/**
	 * Creates an error
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.error - object that contains the error
	 * @param {string} payload.message - possible error message
	 * @param {object} payload.errors - possible object that contains multiple errors
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_ERROR(payload) {
		return new Promise(resolve => {
			let error = "An error occurred.";
			if (typeof payload.error === "string") error = payload.error;
			else if (payload.error.message) {
				if (payload.error.message !== "Validation failed") error = payload.error.message;
				else error = payload.error.errors[Object.keys(payload.error.errors)].message;
			}
			resolve(error);
		});
	}

	/**
	 * Creates the gravatar url for a specified email address
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.email - the email address
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	CREATE_GRAVATAR(payload) {
		return new Promise(resolve => {
			const hash = crypto.createHash("md5").update(payload.email).digest("hex");

			resolve(`https://www.gravatar.com/avatar/${hash}`);
		});
	}

	/**
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	DEBUG() {
		return new Promise(resolve => resolve());
	}
}

export default new _UtilsModule();
