import config from "config";

import async from "async";
import crypto from "crypto";
import request from "request";
import CoreClass from "../core";

class UtilsModule extends CoreClass {
	constructor() {
		super("utils");

		this.youtubeRequestCallbacks = [];
		this.youtubeRequestsPending = 0;
		this.youtubeRequestsActive = false;
	}

	initialize() {
		return new Promise(resolve => {
			this.io = this.moduleManager.modules.io;
			this.db = this.moduleManager.modules.db;
			this.spotify = this.moduleManager.modules.spotify;
			this.cache = this.moduleManager.modules.cache;

			resolve();
		});
	}

	PARSE_COOKIES(payload) {
		// cookieString
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

	REMOVE_COOKIE(payload) {
		// cookieString, cookieName
		return new Promise((resolve, reject) => {
			let cookies;

			try {
				cookies = this.runJob("PARSE_COOKIES", {
					cookieString: payload.cookieString
				});
			} catch (err) {
				return reject(err);
			}

			delete cookies[payload.cookieName];

			return resolve(this.toString(cookies));
		});
	}

	HTML_ENTITIES(payload) {
		// str
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

	GENERATE_RANDOM_STRING(payload) {
		// length
		return new Promise((resolve, reject) => {
			const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");

			let randomNum;

			try {
				randomNum = this.runJob("GET_RANDOM_NUMBER", {
					min: 0,
					max: chars.length - 1
				});
			} catch (err) {
				return reject(err);
			}

			const result = [];
			for (let i = 0; i < payload.length; i += 1) {
				result.push(chars[randomNum]);
			}

			return resolve(result.join(""));
		});
	}

	async GET_SOCKET_FROM_ID(payload) {
		// socketId
		const io = await this.io.runJob("IO", {});

		return new Promise(resolve => resolve(io.sockets.sockets[payload.socketId]));
	}

	GET_RANDOM_NUMBER(payload) {
		// min, max
		return new Promise(resolve => {
			resolve(Math.floor(Math.random() * (payload.max - payload.min + 1)) + payload.min);
		});
	}

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

	async SOCKET_FROM_SESSION(payload) {
		// socketId
		const io = await this.io.runJob("IO", {});

		return new Promise((resolve, reject) => {
			const ns = io.of("/");
			if (ns) {
				return resolve(ns.connected[payload.socketId]);
			}

			return reject();
		});
	}

	async SOCKETS_FROM_SESSION_ID(payload) {
		const io = await this.io.runJob("IO", {});

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

	async SOCKETS_FROM_USER(payload) {
		const io = await this.io.runJob("IO", {});

		return new Promise((resolve, reject) => {
			const ns = io.of("/");
			const sockets = [];

			if (ns) {
				return async.each(
					Object.keys(ns.connected),
					(id, next) => {
						const { session } = ns.connected[id];
						this.cache
							.runJob("HGET", {
								table: "sessions",
								key: session.sessionId
							})
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

	async SOCKETS_FROM_IP(payload) {
		const io = await this.io.runJob("IO", {});

		return new Promise(resolve => {
			const ns = io.of("/");
			const sockets = [];
			if (ns) {
				return async.each(
					Object.keys(ns.connected),
					(id, next) => {
						const { session } = ns.connected[id];
						this.cache
							.runJob("HGET", {
								table: "sessions",
								key: session.sessionId
							})
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

	async SOCKETS_FROM_USER_WITHOUT_CACHE(payload) {
		const io = await this.io.runJob("IO", {});

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

	SOCKET_LEAVE_ROOMS(payload) {
		// socketId
		return new Promise((resolve, reject) => {
			let socket;

			try {
				socket = this.runJob("SOCKET_FROM_SESSION", {
					socketId: payload.socketId
				});
			} catch (err) {
				return reject(err);
			}

			const { rooms } = socket;
			for (let room = 0, roomKeys = Object.keys(rooms); room < roomKeys.length; room += 1) {
				socket.leave(room);
			}

			return resolve();
		});
	}

	async SOCKET_JOIN_ROOM(payload) {
		const socket = await this.runJob("SOCKET_FROM_SESSION", {
			socketId: payload.socketId
		});

		// socketId, room
		return new Promise(resolve => {
			const { rooms } = socket;
			for (let room = 0, roomKeys = Object.keys(rooms); room < roomKeys.length; room += 1) {
				socket.leave(room);
			}

			socket.join(payload.room);

			return resolve();
		});
	}

	async SOCKET_JOIN_SONG_ROOM(payload) {
		// socketId, room
		const socket = await this.runJob("SOCKET_FROM_SESSION", {
			socketId: payload.socketId
		});

		return new Promise(resolve => {
			const { rooms } = socket;
			for (let room = 0, roomKeys = Object.keys(rooms); room < roomKeys.length; room += 1) {
				if (room.indexOf("song.") !== -1) socket.leave(rooms);
			}

			socket.join(payload.room);

			return resolve();
		});
	}

	SOCKETS_JOIN_SONG_ROOM(payload) {
		// sockets, room
		return new Promise(resolve => {
			for (let id = 0, socketKeys = Object.keys(payload.sockets); id < socketKeys.length; id += 1) {
				const socket = payload.sockets[socketKeys[id]];

				const { rooms } = socket;
				for (let room = 0, roomKeys = Object.keys(rooms); room < roomKeys.length; room += 1) {
					if (room.indexOf("song.") !== -1) socket.leave(room);
				}

				socket.join(payload.room);
			}

			return resolve();
		});
	}

	SOCKETS_LEAVE_SONG_ROOMS(payload) {
		// sockets
		return new Promise(resolve => {
			for (let id = 0, socketKeys = Object.keys(payload.sockets); id < socketKeys.length; id += 1) {
				const socket = payload.sockets[socketKeys[id]];
				const { rooms } = socket;
				for (let room = 0, roomKeys = Object.keys(rooms); room < roomKeys.length; room += 1) {
					if (room.indexOf("song.") !== -1) socket.leave(room);
				}
			}
			resolve();
		});
	}

	async EMIT_TO_ROOM(payload) {
		// room, ...args
		const io = await this.io.runJob("IO", {});

		return new Promise(resolve => {
			const { sockets } = io.sockets;
			for (let id = 0, socketKeys = Object.keys(sockets); id < socketKeys.length; id += 1) {
				const socket = sockets[socketKeys[id]];
				if (socket.rooms[payload.room]) {
					socket.emit(...payload.args);
				}
			}

			return resolve();
		});
	}

	async GET_ROOM_SOCKETS(payload) {
		const io = await this.io.runJob("IO", {});

		// room
		return new Promise(resolve => {
			const { sockets } = io.sockets;
			const roomSockets = [];
			for (let id = 0, socketKeys = Object.keys(sockets); id < socketKeys.length; id += 1) {
				const socket = sockets[socketKeys[id]];
				if (socket.rooms[payload.room]) roomSockets.push(socket);
			}

			return resolve(roomSockets);
		});
	}

	GET_SONG_FROM_YOUTUBE(payload) {
		// songId, cb
		return new Promise((resolve, reject) => {
			this.youtubeRequestCallbacks.push({
				cb: () => {
					this.youtubeRequestsActive = true;
					const youtubeParams = [
						"part=snippet,contentDetails,statistics,status",
						`id=${encodeURIComponent(payload.songId)}`,
						`key=${config.get("apis.youtube.key")}`
					].join("&");

					request(`https://www.googleapis.com/youtube/v3/videos?${youtubeParams}`, (err, res, body) => {
						this.youtubeRequestCallbacks.splice(0, 1);
						if (this.youtubeRequestCallbacks.length > 0) {
							this.youtubeRequestCallbacks[0].cb(this.youtubeRequestCallbacks[0].songId);
						} else this.youtubeRequestsActive = false;

						if (err) {
							console.error(err);
							return null;
						}

						body = JSON.parse(body);

						if (body.error) {
							console.log("ERROR", "GET_SONG_FROM_YOUTUBE", `${body.error.message}`);
							return reject(new Error("An error has occured. Please try again later."));
						}

						if (body.items[0] === undefined)
							return reject(
								new Error("The specified video does not exist or cannot be publicly accessed.")
							);

						// TODO Clean up duration converter
						let dur = body.items[0].contentDetails.duration;

						dur = dur.replace("PT", "");

						let duration = 0;

						dur = dur.replace(/([\d]*)H/, (v, v2) => {
							v2 = Number(v2);
							duration = v2 * 60 * 60;
							return "";
						});

						dur = dur.replace(/([\d]*)M/, (v, v2) => {
							v2 = Number(v2);
							duration += v2 * 60;
							return "";
						});

						// eslint-disable-next-line no-unused-vars
						dur = dur.replace(/([\d]*)S/, (v, v2) => {
							v2 = Number(v2);
							duration += v2;
							return "";
						});

						const song = {
							songId: body.items[0].id,
							title: body.items[0].snippet.title,
							duration
						};

						return resolve({ song });
					});
				},
				songId: payload.songId
			});

			if (!this.youtubeRequestsActive) {
				this.youtubeRequestCallbacks[0].cb(this.youtubeRequestCallbacks[0].songId);
			}
		});
	}

	FILTER_MUSIC_VIDEOS_YOUTUBE(payload) {
		// videoIds, cb
		return new Promise((resolve, reject) => {
			/**
			 * @param {Function} cb2 - callback
			 */
			function getNextPage(cb2) {
				const localVideoIds = payload.videoIds.splice(0, 50);

				const youtubeParams = [
					"part=topicDetails",
					`id=${encodeURIComponent(localVideoIds.join(","))}`,
					`maxResults=50`,
					`key=${config.get("apis.youtube.key")}`
				].join("&");

				request(`https://www.googleapis.com/youtube/v3/videos?${youtubeParams}`, (err, res, body) => {
					if (err) {
						console.error(err);
						return reject(new Error("Failed to find playlist from YouTube"));
					}

					body = JSON.parse(body);

					if (body.error) {
						console.log("ERROR", "FILTER_MUSIC_VIDEOS_YOUTUBE", `${body.error.message}`);
						return reject(new Error("An error has occured. Please try again later."));
					}

					const songIds = [];
					body.items.forEach(item => {
						const songId = item.id;
						if (!item.topicDetails) return;
						if (item.topicDetails.relevantTopicIds.indexOf("/m/04rlf") !== -1) {
							songIds.push(songId);
						}
					});

					if (payload.videoIds.length > 0) {
						return getNextPage(newSongIds => {
							cb2(songIds.concat(newSongIds));
						});
					}

					return cb2(songIds);
				});
			}

			if (payload.videoIds.length === 0) resolve({ songIds: [] });
			else getNextPage(songIds => resolve({ songIds }));
		});
	}

	GET_PLAYLIST_FROM_YOUTUBE(payload) {
		// payload includes: url, musicOnly
		return new Promise((resolve, reject) => {
			const local = this;

			const name = "list".replace(/[\\[]/, "\\[").replace(/[\]]/, "\\]");

			const regex = new RegExp(`[\\?&]${name}=([^&#]*)`);
			const splitQuery = regex.exec(payload.url);

			if (!splitQuery) {
				console.log("ERROR", "GET_PLAYLIST_FROM_YOUTUBE", "Invalid YouTube playlist URL query.");
				return reject(new Error("An error has occured. Please try again later."));
			}

			const playlistId = splitQuery[1];

			/**
			 * @param {string} pageToken - page token for YouTube API
			 * @param {Array} songs - array of sogns
			 */
			function getPage(pageToken, songs) {
				const nextPageToken = pageToken ? `pageToken=${pageToken}` : "";
				const youtubeParams = [
					"part=contentDetails",
					`playlistId=${encodeURIComponent(playlistId)}`,
					`maxResults=50`,
					`key=${config.get("apis.youtube.key")}`,
					nextPageToken
				].join("&");

				request(
					`https://www.googleapis.com/youtube/v3/playlistItems?${youtubeParams}`,
					async (err, res, body) => {
						if (err) {
							console.error(err);
							return reject(new Error("Failed to find playlist from YouTube"));
						}

						body = JSON.parse(body);

						if (body.error) {
							console.log("ERROR", "GET_PLAYLIST_FROM_YOUTUBE", `${body.error.message}`);
							return reject(new Error("An error has occured. Please try again later."));
						}

						songs = songs.concat(body.items);

						if (body.nextPageToken) return getPage(body.nextPageToken, songs);

						songs = songs.map(song => song.contentDetails.videoId);

						if (!payload.musicOnly) return resolve({ songs });
						return local
							.runJob("FILTER_MUSIC_VIDEOS_YOUTUBE", {
								videoIds: songs.slice()
							})
							.then(filteredSongs => {
								resolve({ filteredSongs, songs });
							});
					}
				);
			}

			return getPage(null, []);
		});
	}

	async GET_SONG_FROM_SPOTIFY(payload) {
		// song
		const token = await this.spotify.runJob("GET_TOKEN", {});

		return new Promise((resolve, reject) => {
			if (!config.get("apis.spotify.enabled")) return reject(new Error("Spotify is not enabled."));

			const song = { ...payload.song };

			const spotifyParams = [`q=${encodeURIComponent(payload.song.title)}`, `type=track`].join("&");

			const options = {
				url: `https://api.spotify.com/v1/search?${spotifyParams}`,
				headers: {
					Authorization: `Bearer ${token}`
				}
			};

			return request(options, (err, res, body) => {
				if (err) console.error(err);
				body = JSON.parse(body);
				if (body.error) console.error(body.error);
				for (let i = 0, bodyKeys = Object.keys(body); i < bodyKeys.length; i += 1) {
					const { items } = body[i];
					for (let j = 0, itemKeys = Object.keys(body); j < itemKeys.length; j += 1) {
						const item = items[j];
						let hasArtist = false;
						for (let k = 0; k < item.artists.length; k += 1) {
							const artist = item.artists[k];
							if (song.title.indexOf(artist.name) !== -1) hasArtist = true;
						}
						if (hasArtist && song.title.indexOf(item.name) !== -1) {
							song.duration = item.duration_ms / 1000;
							song.artists = item.artists.map(artist => artist.name);
							song.title = item.name;
							song.explicit = item.explicit;
							song.thumbnail = item.album.images[1].url;
							break;
						}
					}
				}

				resolve({ song });
			});
		});
	}

	async GET_SONGS_FROM_SPOTIFY(payload) {
		// title, artist
		const token = await this.spotify.runJob("GET_TOKEN", {});

		return new Promise((resolve, reject) => {
			if (!config.get("apis.spotify.enabled")) return reject(new Error("Spotify is not enabled."));

			const spotifyParams = [`q=${encodeURIComponent(payload.title)}`, `type=track`].join("&");

			const options = {
				url: `https://api.spotify.com/v1/search?${spotifyParams}`,
				headers: {
					Authorization: `Bearer ${token}`
				}
			};

			return request(options, (err, res, body) => {
				if (err) return console.error(err);
				body = JSON.parse(body);
				if (body.error) return console.error(body.error);

				const songs = [];

				for (let i = 0, bodyKeys = Object.keys(body); i < bodyKeys.length; i += 1) {
					const { items } = body[i];
					for (let j = 0, itemKeys = Object.keys(body); j < itemKeys.length; j += 1) {
						const item = items[j];
						let hasArtist = false;
						for (let k = 0; k < item.artists.length; k += 1) {
							const localArtist = item.artists[k];
							if (payload.artist.toLowerCase() === localArtist.name.toLowerCase()) hasArtist = true;
						}
						if (
							hasArtist &&
							(payload.title.indexOf(item.name) !== -1 || item.name.indexOf(payload.title) !== -1)
						) {
							const song = {};
							song.duration = item.duration_ms / 1000;
							song.artists = item.artists.map(artist => artist.name);
							song.title = item.name;
							song.explicit = item.explicit;
							song.thumbnail = item.album.images[1].url;
							songs.push(song);
						}
					}
				}

				return resolve({ songs });
			});
		});
	}

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

	GET_ERROR(payload) {
		// err
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

	CREATE_GRAVATAR(payload) {
		// email
		return new Promise(resolve => {
			const hash = crypto.createHash("md5").update(payload.email).digest("hex");

			resolve(`https://www.gravatar.com/avatar/${hash}`);
		});
	}

	DEBUG() {
		return new Promise(resolve => resolve());
	}
}

export default new UtilsModule();
