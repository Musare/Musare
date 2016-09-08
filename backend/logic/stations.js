
// custom modules
const global = require('./global');
var io = global.io;

function Station (id, data) {

	var self = this;

	//TODO Add startedAt and timePaused
	var playlist = data.playlist;
	var currentSong = playlist[0];
	var currentSongIndex = data.currentSongIndex;
	var paused = data.paused;
	var locked = data.locked;
	var skipVotes = data.skipVotes;
	var users = data.users;
	var displayName = data.displayName;
	var description = data.description;
	var timer;
	var nsp = io.of('/' + id);
	nsp.on('connection', function(socket){
		console.log('someone connected');
	});

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
			timer = new global.Timer(function() {
				console.log("Skip!");
				self.skipSong();
			}, currentSong.duration, paused);

			nsp.emit("skippedSong", currentSong);
		}
	};
	this.toggleVoteSkip = function(userId) {
		if (skipVotes.indexOf(userId) === -1) {
			skipVotes.push(userId);
		} else {
			skipVotes = skipVotes.splice(skipVotes.indexOf(userId), 1);
		}
		//TODO Calculate if enough people voted to skip
		nsp.emit("voteSkip", skipVotes);
	};
	this.retrievePlaylist = function() {
		//TODO Use Rethink to get the Playlist for this station
	};
	this.pause = function() {
		if (!paused) {
			paused = true;
			timer.pause();
			nsp.emit("pause");
		}
	};
	this.unpause = function() {
		if (paused) {
			paused = false;
			timer.resume();
			nsp.emit("unpause");
		}
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
			nsp.emit("lock");
		}
	};
	this.unlock = function() {
		if (locked) {
			locked = false;
			nsp.emit("unlocked");
		}
	};
	this.isLocked = function() {
		return locked;
	};
	this.updateDisplayName = function(newDisplayName) {
		//TODO Update RethinkDB
		displayName = newDisplayName;
		nsp.emit("updateDisplayName", newDisplayName);
	};
	this.updateDescription = function(newDescription) {
		//TODO Update RethinkDB
		description = newDescription;
		nsp.emit("updateDescription", newDescription);
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
		nsp.emit("updateUsers", users);
	};
	this.removeUser = function(user) {
		users.splice(users.indexOf(user), 1);
		nsp.emit("updateUsers", users);
	};
	this.getUsers = function() {
		return users;
	};
	this.skipSong();
}

module.exports = {

	stations: [],

	initStation: function (id, data) {
		if (!this.getStation(id)) {
			var station = new Station(id, data);
			this.stations.push(station);
			return station;
		}
		else {
			return false;
		}
	},

	getStation: function (id) {
		var s = null;
		this.stations.forEach(function (station) {
			if (station.id == id) s = station;
		});
		return s;
	},

	getStations: function () {
		return this.stations;
	},

	// creates a brand new station
	createStation: function (data) {
		//TODO: add createStation functionality
		this.initStation(null, data);
	},

	// loads a station from the database
	loadStation: function (id) {
		//TODO: Get the data from RethinkDB
		this.initStation(id, {
			playlist: [
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
			],
			currentSongIndex: 0,
			paused: false,
			locked: false,
			skipVotes: [],
			users: [],
			displayName: "",
			description: ""
		});
	}

};
