'use strict';

const moment  = require('moment'),
	  io      = require('./io'),
	  config  = require('config'),
	  request = require('request'),
	  cache   = require('./cache');

class Timer {
	constructor(callback, delay, paused) {
		this.callback = callback;
		this.timerId = undefined;
		this.start = undefined;
		this.paused = paused;
		this.remaining = moment.duration(delay, "hh:mm:ss").asSeconds() * 1000;
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

function convertTime (duration) {
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

let youtubeRequestCallbacks = [];
let youtubeRequestsPending = 0;
let youtubeRequestsActive = false;

module.exports = {
	htmlEntities: str => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
	generateRandomString: function(len) {
		let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
		let result = [];
		for (let i = 0; i < len; i++) {
			result.push(chars[this.getRandomNumber(0, chars.length - 1)]);
		}
		return result.join("");
	},
	getSocketFromId: function(socketId) {
		return globals.io.sockets.sockets[socketId];
	},
	getRandomNumber: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
	convertTime,
	Timer,
	guid: () => [1,1,0,1,0,1,0,1,0,1,1,1].map(b => b ? Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) : '-').join(''),
	cookies: {
		parseCookies: cookieString => {
			let cookies = {};
			if (cookieString) cookieString.split("; ").map((cookie) => {
				(cookies[cookie.substring(0, cookie.indexOf("="))] = cookie.substring(cookie.indexOf("=") + 1, cookie.length));
			});
			return cookies;
		},
		toString: cookies => {
			let newCookie = [];
			for (let prop in cookie) {
				newCookie.push(prop + "=" + cookie[prop]);
			}
			return newCookie.join("; ");
		},
		removeCookie: (cookieString, cookieName) => {
			var cookies = this.parseCookies(cookieString);
			delete cookies[cookieName];
			return this.toString(cookies);
		}
	},
	socketFromSession: function(socketId) {
		let ns = io.io.of("/");
		if (ns) {
			return ns.connected[socketId];
		}
	},
	socketsFromUser: function(userId, cb) {
		let ns = io.io.of("/");
		let sockets = [];
		if (ns) {
			let total = Object.keys(ns.connected).length;
			let done = 0;
			for (let id in ns.connected) {
				let session = ns.connected[id].session;
				cache.hget('sessions', session.sessionId, (err, session) => {
					if (!err && session && session.userId === userId) {
						sockets.push(ns.connected[id]);
					}
					checkComplete();
				});
			}
			function checkComplete() {
				done++;
				if (done === total) {
					cb(sockets);
				}
			}
		}
	},
	socketLeaveRooms: function(socketid) {
		let socket = this.socketFromSession(socketid);
		let rooms = socket.rooms;
		for (let room in rooms) {
			socket.leave(room);
		}
	},
	socketJoinRoom: function(socketId, room) {
		let socket = this.socketFromSession(socketId);
		let rooms = socket.rooms;
		for (let room in rooms) {
			socket.leave(room);
		}
		socket.join(room);
	},
	socketJoinSongRoom: function(socketId, room) {
		let socket = this.socketFromSession(socketId);
		let rooms = socket.rooms;
		for (let room in rooms) {
			if (room.indexOf('song.') !== -1) socket.leave(rooms);
		}
		socket.join(room);
	},
	socketsJoinSongRoom: function(sockets, room) {
		for (let id in sockets) {
			let socket = sockets[id];
			let rooms = socket.rooms;
			for (let room in rooms) {
				if (room.indexOf('song.') !== -1) socket.leave(room);
			}
			socket.join(room);
		}
	},
	socketsLeaveSongRooms: function(sockets) {
		for (let id in sockets) {
			let socket = sockets[id];
			let rooms = socket.rooms;
			for (let room in rooms) {
				if (room.indexOf('song.') !== -1) socket.leave(room);
			}
		}
	},
	emitToRoom: function(room) {
		let sockets = io.io.sockets.sockets;
		for (let id in sockets) {
			let socket = sockets[id];
			if (socket.rooms[room]) {
				let args = [];
				for (let i = 1; i < Object.keys(arguments).length; i++) {
					args.push(arguments[i]);
				}
				socket.emit.apply(socket, args);
			}
		}
	},
	getRoomSockets: function(room) {
		let sockets = io.io.sockets.sockets;
		let roomSockets = [];
		for (let id in sockets) {
			let socket = sockets[id];
			if (socket.rooms[room]) roomSockets.push(socket);
		}
		return roomSockets;
	},
	getSongFromYouTube: (songId, cb) => {

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

				//TODO Clean up duration converter
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
				});

				let song = {
					_id: body.items[0].id,
					title: body.items[0].snippet.title,
					duration
				};
				cb(song);
			});
		}, songId});

		if (!youtubeRequestsActive) {
			youtubeRequestCallbacks[0].cb(youtubeRequestCallbacks[0].songId);
		}
	},
	getPlaylistFromYouTube: (url, cb) => {
		
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
	},
	getSongFromSpotify: (song, cb) => {
		const spotifyParams = [
			`q=${encodeURIComponent(song.title)}`,
			`type=track`
		].join('&');

		request(`https://api.spotify.com/v1/search?${spotifyParams}`, (err, res, body) => {

			if (err) console.error(err);

			body = JSON.parse(body);

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

			cb(song);
		});
	},
	shuffle: (array) => {
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
};
