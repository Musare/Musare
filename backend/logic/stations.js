'use strict';

const global = require('./global');
const io = global.io;
let stations = [];

module.exports = {
	Station: class Station {
		constructor(id, data) {
			this.nsp = io.of(id);
			let local = this;
			this.nsp.on('connection', (socket, cb) => {
				console.log('someone connected');
				socket.on("pause", function() {
					local.pause();
				});
				socket.on("unpause", function() {
					local.unPause();
				});
				socket.on("skipSong", function() {
					local.skipSong();
				});

				socket.emit("connected", {
					displayName: this.getDisplayName(),
					users: this.getUsers().length,
					currentSong: this.getCurrentSong(),
					timePaused: this.getTimePaused(),
					paused: this.isPaused(),
					currentTime: Date.now()
				});
			});
			this.id = id;

			this.playlist = data.playlist;
			this.currentSongIndex = data.currentSongIndex;
			this.currentSong = this.playlist[this.currentSongIndex];
			this.paused = data.paused;
			this.locked = data.locked;
			this.skipVotes = 0;
			this.users = [];
			this.displayName = data.displayName;
			this.description = data.description;
			this.timePaused = 0;
			this.timer = undefined;
			this.skipSong();
		}

		skipSong() {
			if (this.playlist.length > 0) {
				if (this.timer !== undefined) this.timer.pause();

				if (this.currentSongIndex + 1 < this.playlist.length) this.currentSongIndex++;
				else this.currentSongIndex = 0;

				this.skipVotes = 0;
				this.currentSong = this.playlist[this.currentSongIndex];

				var self = this;
				this.timer = new global.Timer(() => {
					self.skipSong();
				}, this.currentSong.duration, this.paused);
				this.timePaused = 0;
				this.currentSong.startedAt = Date.now();
				this.nsp.emit("skippedSong", this.currentSong);
			}
		}

		toggleVoteSkip(userId) {
			if (this.skipVotes.indexOf(userId) === -1) this.skipVotes.push(userId);
			else this.skipVotes = this.skipVotes.splice(this.skipVotes.indexOf(userId), 1);

			// TODO: Calculate if enough people voted to skip
			this.nsp.emit("voteSkip", this.skipVotes);
		}

		retrievePlaylist() {
			// TODO: get the Playlist for this station using db
		}

		pause() {
			console.log("PAUSE");
			if (!this.paused) {
				this.paused = true;
				this.timer.pause();
				this.nsp.emit("pause");
			}
		}

		unPause() {
			console.log("UNPAUSE");
			if (this.paused) {
				this.paused = false;
				this.timer.resume();
				this.timePaused += this.timer.getTimePaused();
				this.nsp.emit("unpause", this.timePaused);
			}
		}

		isPaused() {
			return this.paused;
		}

		getCurrentSong() {
			return this.currentSong;
		}

		lock() {
			if (!this.locked) {
				this.locked = true;
				this.nsp.emit("lock");
			}
		}

		unlock() {
			if (this.locked) {
				this.locked = false;
				this.nsp.emit("unlocked");
			}
		}

		isLocked() {
			return this.locked;
		}

		updateDisplayName(newDisplayName) {
			// TODO: Update db
			this.displayName = newDisplayName;
			this.nsp.emit("updateDisplayName", newDisplayName);
		}

		updateDescription(newDescription) {
			// TODO: Update db
			this.description = newDescription;
			this.nsp.emit("updateDescription", newDescription);
		}

		getId() {
			return this.id;
		}

		getDisplayName() {
			return this.displayName;
		}

		getDescription() {
			return this.description;
		}

		addUser(user) {
			this.users.add(user);
			this.nsp.emit("updateUsers", this.users);
		}

		removeUser(user) {
			this.users.splice(this.users.indexOf(user), 1);
			this.nsp.emit("updateUsers", this.users);
		}

		getUsers() {
			return this.users;
		}

		getTimePaused() {
			console.log(this.timePaused, "        ", this.timer.getTimePaused());
			return this.timePaused + this.timer.getTimePaused();
		}
	},
	addStation: station => {
		stations.push(station);
	},
	getStation: id => {
		let result;
		stations.forEach(function(station) {
			if (station.getId() === id) {
				result = station;
			}
		});
		return result;
	},
	getStations: () => {
		return stations;
	}
};
