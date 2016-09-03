'use strict';

// nodejs modules
const path = require('path'),
      fs   = require('fs'),
      os   = require('os');

// npm modules
const config    = require('config'),
      request   = require('request'),
      waterfall = require('async/waterfall').
      r         = require('rethinkdb');

// custom modules
const utils = require('./utils');

var dbConnection = null;


// station stuff
var stations = [];

//TODO Find better name for this (createStation will be to add a station to the db)
function makeStation(id) {
	if (!getStation(id)) {
		var station = new Station(id);
		stations.push(station);
		return station;
	} else {
		return false;
	}
}

function getStation(id) {
	stations.forEach(function(station) {
		this.station = station;
	});
	return this.station;
}

function Station(id) {
	//TODO Add startedAt and timePaused
	var self = this;
	var playlist = [
		{
			mid: "3498fd83",
			duration: 20000,
			title: "Test1"
		},
		{
			mid: "3498fd83434",
			duration: 10000,
			title: "Test2"
		}
	];//TODO Get this from RethinkDB
	var currentSong = playlist[0];
	var currentSongIndex = 0;//TODO Get this from RethinkDB
	var paused = true;//TODO Get this from RethinkDB
	var locked = false;//TODO Get this from RethinkDB
	var skipVotes = [];
	var users = [];
	var timer;
	var displayName;//TODO Get this from RethinkDB
	var description;//TODO Get this from RethinkDB

	this.skipSong = function() {
		if (playlist.length > 0) {
			if (timer !== undefined) {
				timer.pause();
			}
			if (currentSongIndex+1 < playlist.length) {
				currentSongIndex++;
			} else {
				currentSongIndex = 0;
			}
			skipVotes = 0;
			currentSong = playlist[currentSongIndex];
			timer = new Timer(function() {
				console.log("Skip!");
				self.skipSong();
			}, currentSong.duration, paused);

			//io.emit("skipSong " + id, currentSong);
		}
	};
	this.toggleVoteSkip = function(userId) {
		if (skipVotes.indexOf(userId) === -1) {
			skipVotes.push(userId);
		} else {
			skipVotes = skipVotes.splice(skipVotes.indexOf(userId), 1);
		}
		//TODO Calculate if enough people voted to skip
		//TODO Emit
	};
	this.retrievePlaylist = function() {
		//TODO Use Rethink to get the Playlist for this room
	};
	this.pause = function() {
		if (!paused) {
			paused = true;
			timer.pause();
		}
		//TODO Emit
	};
	this.unpause = function() {
		if (paused) {
			paused = false;
			timer.resume();
		}
		//TODO Emit
	};
	this.isPaused = function() {
		return paused;
	};
	this.getCurrentSong = function() {
		return currentSong;
	};
	this.lock = function() {
		if (!locked) {
			locked = true;
		}
		//TODO Emit
	};
	this.unlock = function() {
		if (locked) {
			locked = false;
		}
		//TODO Emit
	};
	this.isLocked = function() {
		return locked;
	};
	this.updateDisplayName = function(newDisplayName) {
		//TODO Update RethinkDB
		displayName = newDisplayName;
	};
	this.updateDescription = function(newDescription) {
		//TODO Update RethinkDB
		description = newDescription;
	};
	this.getId = function() {
		return id;
	};
	this.getDisplayName = function() {
		return displayName;
	};
	this.getDescription = function() {
		return description;
	};
	this.addUser = function(user) {
		users.add(user);
	};
	this.removeUser = function(user) {
		users.splice(users.indexOf(user), 1);
	};
	this.getUsers = function() {
		return users;
	};
	this.skipSong();
}

function Timer(callback, delay, paused) {
	var timerId, start, remaining = delay;
	var timeWhenPaused = 0;
	var timePaused = Date.now();

	this.pause = function () {
		clearTimeout(timerId);
		remaining -= Date.now() - start;
		timePaused = Date.now();
	};

	this.resume = function () {
		start = Date.now();
		clearTimeout(timerId);
		timerId = setTimeout(callback, remaining);
		timeWhenPaused += Date.now() - timePaused;
	};

	this.resetTimeWhenPaused = function() {
		timeWhenPaused = 0;
	};

	this.timeWhenPaused = function () {
		return timeWhenPaused;
	};

	if (paused === false) {
		this.resume();
	}
}


module.exports = {

	setup: function (dbConn) {
		dbConnection = dbConn;
	},

	disconnect: function () {

	},

	login: function (user, cb) {

		if (!user.username || !user.password) {
			return cb({ status: 'error', message: 'Invalid login request' });
		}

		r.table('users').filter({
			username: user.username,
			password: crypto.createHash('md5').update(user.password).digest("hex")
		}).run(rc, (err, cursor) => {
			if (err) {
				return cb({ status: 'failure', message: 'Error while fetching the user' });
			}
			else {
				cursor.toArray((err, result) => {
					if (err) {
						return cb({ status: 'failure', message: 'Error while fetching the user' });
					}
					else {
						return cb({ status: 'success', user: result });
					}
				});
			}
		});
	},

	register: function (user, cb) {

		if (!user.email || !user.username || !user.password) {
			return cb({ status: 'error', message: 'Invalid register request' });
		}

		// TODO: Implement register
	},

	rooms: function (cb) {
		var _rooms = stations.map(function(result) {
			return {
				id: result.getId(),
				displayName: result.getDisplayName(),
				description: result.getDescription(),
				users: result.getUsers()
			}
		});
		cb(_rooms);
	},

	handleRoomJoin: function (id, cb) {

		var room = getStation(id);
		socket.custom.roomId = id;

		var userInfo = {
			username: socket.custom.user.username
		};

		// tell all the users in this room that someone is joining it
		io.sockets.clients().forEach(function (otherSocket) {
			if (otherSocket != socket && otherSocket.custom.roomId === id) {
				otherSocket.emit('roomUserJoin', { user: userInfo });
			}
		});

		return cb({
			status: 'joined',
			data: {
				room: room
			}
		});
	},

	search: function (query, cb) {
		request('https://www.googleapis.com/youtube/v3/search?' + [
				'part=snippet', `q=${encodeURIComponent(query)}`, `key=${config.get('apis.youtube.key')}`, 'type=video', 'maxResults=25'
			].join('&'), (err, res, body) => {
			if (err) {
				socket.emit('search', { status: 'error', message: 'Failed to make request' });
			}
			else {
				try {
					socket.emit('search', { status: 'success', body: JSON.parse(body) });
				}
				catch (e) {
					socket.emit('search', { status: 'error', message: 'Non JSON response' });
				}
			}
		});
	}
};
