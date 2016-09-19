'use strict';

const global = require('./global');
const io = global.io;
let stations = [];

module.exports = {
	Station: class Station {
		constructor(id, data) {
			this.nsp = io.of(id);
			this.nsp.on('connection', socket => {
				console.log('someone connected');
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
			if (!this.paused) {
				this.paused = true;
				this.timer.pause();
				this.snp.emit("pause");
			}
		}

		unPause() {
			if (this.paused) {
				this.paused = false;
				this.timer.resume();
				this.snp.emit("unpause");
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
				this.snp.emit("lock");
			}
		}

		unlock() {
			if (this.locked) {
				this.locked = false;
				this.snp.emit("unlocked");
			}
		}

		isLocked() {
			return this.locked;
		}

		updateDisplayName(newDisplayName) {
			// TODO: Update db
			this.displayName = newDisplayName;
			this.snp.emit("updateDisplayName", newDisplayName);
		}

		updateDescription(newDescription) {
			// TODO: Update db
			this.description = newDescription;
			this.snp.emit("updateDescription", newDescription);
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
			this.snp.emit("updateUsers", this.users);
		}

		removeUser(user) {
			this.users.splice(this.users.indexOf(user), 1);
			this.snp.emit("updateUsers", this.users);
		}

		getUsers() {
			return this.users;
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
