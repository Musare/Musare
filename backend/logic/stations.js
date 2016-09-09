
// custom modules
const global = require('./global');
var io = global.io;

function Station (id, data) {

	const self = this;

	//TODO Add startedAt and timePaused
	let playlist = data.playlist;
	let currentSong = playlist[0];
	let currentSongIndex = data.currentSongIndex;
	let paused = data.paused;
	let locked = data.locked;
	let skipVotes = data.skipVotes;
	let users = data.users;
	let displayName = data.displayName;
	let description = data.description;
	let timer;
	let nsp = io.of('/' + id);
	nsp.on('connection', socket => {
		console.log('someone connected');
	});

	this.skipSong = () => {
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
			timer = new global.Timer(() => {
				console.log("Skip!");
				self.skipSong();
			}, currentSong.duration, paused);

			nsp.emit("skippedSong", currentSong);
		}
	};
	this.toggleVoteSkip = userId => {
		if (skipVotes.indexOf(userId) === -1) {
			skipVotes.push(userId);
		} else {
			skipVotes = skipVotes.splice(skipVotes.indexOf(userId), 1);
		}
		//TODO Calculate if enough people voted to skip
		nsp.emit("voteSkip", skipVotes);
	};
	this.retrievePlaylist = () => {
		//TODO Use Rethink to get the Playlist for this station
	};
	this.pause = () => {
		if (!paused) {
			paused = true;
			timer.pause();
			nsp.emit("pause");
		}
	};
	this.unpause = () => {
		if (paused) {
			paused = false;
			timer.resume();
			nsp.emit("unpause");
		}
	};
	this.isPaused = () => {
		return paused;
	};
	this.getCurrentSong = () => {
		return currentSong;
	};
	this.lock = () => {
		if (!locked) {
			locked = true;
			nsp.emit("lock");
		}
	};
	this.unlock = () => {
		if (locked) {
			locked = false;
			nsp.emit("unlocked");
		}
	};
	this.isLocked = () => {
		return locked;
	};
	this.updateDisplayName = newDisplayName => {
		//TODO Update RethinkDB
		displayName = newDisplayName;
		nsp.emit("updateDisplayName", newDisplayName);
	};
	this.updateDescription = newDescription => {
		//TODO Update RethinkDB
		description = newDescription;
		nsp.emit("updateDescription", newDescription);
	};
	this.getId = () => {
		return id;
	};
	this.getDisplayName = () => {
		return displayName;
	};
	this.getDescription = () => {
		return description;
	};
	this.addUser = user => {
		users.add(user);
		nsp.emit("updateUsers", users);
	};
	this.removeUser = user => {
		users.splice(users.indexOf(user), 1);
		nsp.emit("updateUsers", users);
	};
	this.getUsers = () => {
		return users;
	};
	this.skipSong();
}

module.exports = {

	stations: [],

	initStation: (id, data) => {
		if (!this.getStation(id)) {
			let station = new Station(id, data);
			this.stations.push(station);
			return station;
		}
		else {
			return false;
		}
	},

	getStation: id => {
		let s = null;
		this.stations.forEach(function (station) {
			if (station.id == id) s = station;
		});
		return s;
	},

	getStations: () => {
		return this.stations;
	},

	// creates a brand new station
	createStation: data => {
		//TODO: add createStation functionality
		this.initStation(null, data);
	},

	// loads a station from the database
	loadStation: id => {
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
