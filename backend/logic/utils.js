'use strict';

const coreClass = require("../core");

const config  = require('config'),
	  async	  = require('async'),
	  request = require('request');

class Timer {
	constructor(callback, delay, paused) {
		this.callback = callback;
		this.timerId = undefined;
		this.start = undefined;
		this.paused = paused;
		this.remaining = delay;
		this.timeWhenPaused = 0;
		this.timePaused = Date.now();

		if (!paused) {
			this.resume();
		}
	}

	pause() {
		clearTimeout(this.timerId);
		this.remaining -= Date.now() - this.start;
		this.timePaused = Date.now();
		this.paused = true;
	}

	ifNotPaused() {
		if (!this.paused) {
			this.resume();
		}
	}

	resume() {
		this.start = Date.now();
		clearTimeout(this.timerId);
		this.timerId = setTimeout(this.callback, this.remaining);
		this.timeWhenPaused = Date.now() - this.timePaused;
		this.paused = false;
	}

	resetTimeWhenPaused() {
		this.timeWhenPaused = 0;
	}

	getTimePaused() {
		if (!this.paused) {
			return this.timeWhenPaused;
		} else {
			return Date.now() - this.timePaused;
		}
	}
} 

let youtubeRequestCallbacks = [];
let youtubeRequestsPending = 0;
let youtubeRequestsActive = false;

module.exports = class extends coreClass {
	initialize() {
		return new Promise((resolve, reject) => {
			this.setStage(1);
			
			this.io = this.moduleManager.modules["io"];
			this.db = this.moduleManager.modules["db"];
			this.spotify = this.moduleManager.modules["spotify"];
			this.cache = this.moduleManager.modules["cache"];

			this.Timer = Timer;

			resolve();
		});
	}

	async parseCookies(cookieString) {
		try { await this._validateHook(); } catch { return; }
		let cookies = {};
		if (cookieString) cookieString.split("; ").map((cookie) => {
			(cookies[cookie.substring(0, cookie.indexOf("="))] = cookie.substring(cookie.indexOf("=") + 1, cookie.length));
		});
		return cookies;
	}

	async cookiesToString(cookies) {
		try { await this._validateHook(); } catch { return; }
		let newCookie = [];
		for (let prop in cookie) {
			newCookie.push(prop + "=" + cookie[prop]);
		}
		return newCookie.join("; ");
	}

	async removeCookie(cookieString, cookieName) {
		try { await this._validateHook(); } catch { return; }
		var cookies = this.parseCookies(cookieString);
		delete cookies[cookieName];
		return this.toString(cookies);
	}

	async htmlEntities(str) {
		try { await this._validateHook(); } catch { return; }
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
	}

	async generateRandomString(len) {
		try { await this._validateHook(); } catch { return; }
		let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
		let result = [];
		for (let i = 0; i < len; i++) {
			result.push(chars[await this.getRandomNumber(0, chars.length - 1)]);
		}
		return result.join("");
	}

	async getSocketFromId(socketId) {
		try { await this._validateHook(); } catch { return; }
		return globals.io.sockets.sockets[socketId];
	}

	async getRandomNumber(min, max) {
		try { await this._validateHook(); } catch { return; }
		return Math.floor(Math.random() * (max - min + 1)) + min
	}

	async convertTime(duration) {
		try { await this._validateHook(); } catch { return; }
		let a = duration.match(/\d+/g);
	
		if (duration.indexOf('M') >= 0 && duration.indexOf('H') == -1 && duration.indexOf('S') == -1) {
			a = [0, a[0], 0];
		}
	
		if (duration.indexOf('H') >= 0 && duration.indexOf('M') == -1) {
			a = [a[0], 0, a[1]];
		}
		if (duration.indexOf('H') >= 0 && duration.indexOf('M') == -1 && duration.indexOf('S') == -1) {
			a = [a[0], 0, 0];
		}
	
		duration = 0;
	
		if (a.length == 3) {
			duration = duration + parseInt(a[0]) * 3600;
			duration = duration + parseInt(a[1]) * 60;
			duration = duration + parseInt(a[2]);
		}
	
		if (a.length == 2) {
			duration = duration + parseInt(a[0]) * 60;
			duration = duration + parseInt(a[1]);
		}
	
		if (a.length == 1) {
			duration = duration + parseInt(a[0]);
		}
	
		let hours = Math.floor(duration / 3600);
		let minutes = Math.floor(duration % 3600 / 60);
		let seconds = Math.floor(duration % 3600 % 60);
	
		return (hours < 10 ? ("0" + hours + ":") : (hours + ":")) + (minutes < 10 ? ("0" + minutes + ":") : (minutes + ":")) + (seconds < 10 ? ("0" + seconds) : seconds);
	}

	async guid () {
		try { await this._validateHook(); } catch { return; }
		return [1,1,0,1,0,1,0,1,0,1,1,1].map(b => b ? Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) : '-').join('');
	}

	async socketFromSession(socketId) {
		try { await this._validateHook(); } catch { return; }

		let ns = this.io.io.of("/");
		if (ns) {
			return ns.connected[socketId];
		}
	}

	async socketsFromSessionId(sessionId, cb) {
		try { await this._validateHook(); } catch { return; }

		let ns = this.io.io.of("/");
		let sockets = [];
		if (ns) {
			async.each(Object.keys(ns.connected), (id, next) => {
				let session = ns.connected[id].session;
				if (session.sessionId === sessionId) sockets.push(session.sessionId);
				next();
			}, () => {
				cb(sockets);
			});
		}
	}

	async socketsFromUser(userId, cb) {
		try { await this._validateHook(); } catch { return; }

		let ns = this.io.io.of("/");
		let sockets = [];
		if (ns) {
			async.each(Object.keys(ns.connected), (id, next) => {
				let session = ns.connected[id].session;
				this.cache.hget('sessions', session.sessionId, (err, session) => {
					if (!err && session && session.userId === userId) sockets.push(ns.connected[id]);
					next();
				});
			}, () => {
				cb(sockets);
			});
		}
	}

	async socketsFromIP(ip, cb) {
		try { await this._validateHook(); } catch { return; }

		let ns = this.io.io.of("/");
		let sockets = [];
		if (ns) {
			async.each(Object.keys(ns.connected), (id, next) => {
				let session = ns.connected[id].session;
				this.cache.hget('sessions', session.sessionId, (err, session) => {
					if (!err && session && ns.connected[id].ip === ip) sockets.push(ns.connected[id]);
					next();
				});
			}, () => {
				cb(sockets);
			});
		}
	}

	async socketsFromUserWithoutCache(userId, cb) {
		try { await this._validateHook(); } catch { return; }

		let ns = this.io.io.of("/");
		let sockets = [];
		if (ns) {
			async.each(Object.keys(ns.connected), (id, next) => {
				let session = ns.connected[id].session;
				if (session.userId === userId) sockets.push(ns.connected[id]);
				next();
			}, () => {
				cb(sockets);
			});
		}
	}

	async socketLeaveRooms(socketid) {
		try { await this._validateHook(); } catch { return; }

		let socket = await this.socketFromSession(socketid);
		let rooms = socket.rooms;
		for (let room in rooms) {
			socket.leave(room);
		}
	}

	async socketJoinRoom(socketId, room) {
		try { await this._validateHook(); } catch { return; }

		let socket = await this.socketFromSession(socketId);
		let rooms = socket.rooms;
		for (let room in rooms) {
			socket.leave(room);
		}
		socket.join(room);
	}

	async socketJoinSongRoom(socketId, room) {
		try { await this._validateHook(); } catch { return; }

		let socket = await this.socketFromSession(socketId);
		let rooms = socket.rooms;
		for (let room in rooms) {
			if (room.indexOf('song.') !== -1) socket.leave(rooms);
		}
		socket.join(room);
	}

	async socketsJoinSongRoom(sockets, room) {
		try { await this._validateHook(); } catch { return; }

		for (let id in sockets) {
			let socket = sockets[id];
			let rooms = socket.rooms;
			for (let room in rooms) {
				if (room.indexOf('song.') !== -1) socket.leave(room);
			}
			socket.join(room);
		}
	}

	async socketsLeaveSongRooms(sockets) {
		try { await this._validateHook(); } catch { return; }

		for (let id in sockets) {
			let socket = sockets[id];
			let rooms = socket.rooms;
			for (let room in rooms) {
				if (room.indexOf('song.') !== -1) socket.leave(room);
			}
		}
	}

	async emitToRoom(room, ...args) {
		try { await this._validateHook(); } catch { return; }

		let sockets = this.io.io.sockets.sockets;
		for (let id in sockets) {
			let socket = sockets[id];
			if (socket.rooms[room]) {
				socket.emit.apply(socket, args);
			}
		}
	}

	async getRoomSockets(room) {
		try { await this._validateHook(); } catch { return; }

		let sockets = this.io.io.sockets.sockets;
		let roomSockets = [];
		for (let id in sockets) {
			let socket = sockets[id];
			if (socket.rooms[room]) roomSockets.push(socket);
		}
		return roomSockets;
	}

	async getSongFromYouTube(songId, cb) {
		try { await this._validateHook(); } catch { return; }

		youtubeRequestCallbacks.push({cb: (test) => {
			youtubeRequestsActive = true;
			const youtubeParams = [
				'part=snippet,contentDetails,statistics,status',
				`id=${encodeURIComponent(songId)}`,
				`key=${config.get('apis.youtube.key')}`
			].join('&');

			request(`https://www.googleapis.com/youtube/v3/videos?${youtubeParams}`, (err, res, body) => {

				youtubeRequestCallbacks.splice(0, 1);
				if (youtubeRequestCallbacks.length > 0) {
					youtubeRequestCallbacks[0].cb(youtubeRequestCallbacks[0].songId);
				} else youtubeRequestsActive = false;

				if (err) {
					console.error(err);
					return null;
				}

				body = JSON.parse(body);

				/*//TODO Clean up duration converter
  				let dur = body.items[0].contentDetails.duration;
				dur = dur.replace('PT', '');
				let duration = 0;
				dur = dur.replace(/([\d]*)H/, (v, v2) => {
					v2 = Number(v2);
					duration = (v2 * 60 * 60);
					return '';
				});
				dur = dur.replace(/([\d]*)M/, (v, v2) => {
					v2 = Number(v2);
					duration += (v2 * 60);
					return '';
				});
				dur = dur.replace(/([\d]*)S/, (v, v2) => {
					v2 = Number(v2);
					duration += v2;
					return '';
				});*/

				let song = {
					songId: body.items[0].id,
					title: body.items[0].snippet.title/*,
					duration*/
				};
				cb(song);
			});
		}, songId});

		if (!youtubeRequestsActive) {
			youtubeRequestCallbacks[0].cb(youtubeRequestCallbacks[0].songId);
		}
	}

	async getPlaylistFromYouTube(url, cb) {
		try { await this._validateHook(); } catch { return; }

		let name = 'list'.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
		var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
		let playlistId = regex.exec(url)[1];

		function getPage(pageToken, songs) {
			let nextPageToken = (pageToken) ? `pageToken=${pageToken}` : '';
			const youtubeParams = [
				'part=contentDetails',
				`playlistId=${encodeURIComponent(playlistId)}`,
				`maxResults=5`,
				`key=${config.get('apis.youtube.key')}`,
				nextPageToken
			].join('&');

			request(`https://www.googleapis.com/youtube/v3/playlistItems?${youtubeParams}`, (err, res, body) => {
				if (err) {
					console.error(err);
					return next('Failed to find playlist from YouTube');
				}

				body = JSON.parse(body);
				songs = songs.concat(body.items);
				if (body.nextPageToken) getPage(body.nextPageToken, songs);
				else {
					console.log(songs);
					cb(songs);
				}
			});
		}
		getPage(null, []);
	}

	async getSongFromSpotify(song, cb) {
		try { await this._validateHook(); } catch { return; }

		if (!config.get("apis.spotify.enabled")) return cb("Spotify is not enabled", null);

		const spotifyParams = [
			`q=${encodeURIComponent(song.title)}`,
			`type=track`
		].join('&');

		const token = await this.spotify.getToken();
		const options = {
			url: `https://api.spotify.com/v1/search?${spotifyParams}`,
			headers: {
				Authorization: `Bearer ${token}`
			}
		};

		request(options, (err, res, body) => {
			if (err) console.error(err);
			body = JSON.parse(body);
			if (body.error) console.error(body.error);

			durationArtistLoop:
			for (let i in body) {
				let items = body[i].items;
				for (let j in items) {
					let item = items[j];
					let hasArtist = false;
					for (let k = 0; k < item.artists.length; k++) {
						let artist = item.artists[k];
						if (song.title.indexOf(artist.name) !== -1) hasArtist = true;
					}
					if (hasArtist && song.title.indexOf(item.name) !== -1) {
						song.duration = item.duration_ms / 1000;
						song.artists = item.artists.map(artist => {
							return artist.name;
						});
						song.title = item.name;
						song.explicit = item.explicit;
						song.thumbnail = item.album.images[1].url;
						break durationArtistLoop;
					}
				}
			}

			cb(null, song);
		});
	}

	async getSongsFromSpotify(title, artist, cb) {
		try { await this._validateHook(); } catch { return; }

		if (!config.get("apis.spotify.enabled")) return cb([]);

		const spotifyParams = [
			`q=${encodeURIComponent(title)}`,
			`type=track`
		].join('&');
		
		const token = await this.spotify.getToken();
		const options = {
			url: `https://api.spotify.com/v1/search?${spotifyParams}`,
			headers: {
				Authorization: `Bearer ${token}`
			}
		};

		request(options, (err, res, body) => {
			if (err) return console.error(err);
			body = JSON.parse(body);
			if (body.error) return console.error(body.error);

			let songs = [];

			for (let i in body) {
				let items = body[i].items;
				for (let j in items) {
					let item = items[j];
					let hasArtist = false;
					for (let k = 0; k < item.artists.length; k++) {
						let localArtist = item.artists[k];
						if (artist.toLowerCase() === localArtist.name.toLowerCase()) hasArtist = true;
					}
					if (hasArtist && (title.indexOf(item.name) !== -1 || item.name.indexOf(title) !== -1)) {
						let song = {};
						song.duration = item.duration_ms / 1000;
						song.artists = item.artists.map(artist => {
							return artist.name;
						});
						song.title = item.name;
						song.explicit = item.explicit;
						song.thumbnail = item.album.images[1].url;
						songs.push(song);
					}
				}
			}

			cb(songs);
		});
	}

	async shuffle(array) {
		try { await this._validateHook(); } catch { return; }

		let currentIndex = array.length, temporaryValue, randomIndex;

		// While there remain elements to shuffle...
		while (0 !== currentIndex) {

			// Pick a remaining element...
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;

			// And swap it with the current element.
			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}

		return array;
	}

	async getError(err) {
		try { await this._validateHook(); } catch { return; }

		let error = 'An error occurred.';
		if (typeof err === "string") error = err;
		else if (err.message) {
			if (err.message !== 'Validation failed') error = err.message;
			else error = err.errors[Object.keys(err.errors)].message;
		}
		return error;
	}
}
