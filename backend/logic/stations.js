'use strict';

const global = require('./global');
const Promise = require('bluebird');
const io = global.io;
let stations = [];

module.exports = {
	Station: class Station {
		constructor(id, data) {
			this.nsp = io.of(id);
			let local = this;
			this.nsp.on('connection', (socket, cb) => {
				// socket.on("pause", () => {
				// 	local.pause();
				// });

				// socket.on("unpause", () => {
				// 	local.unPause();
				// });

				socket.emit("connected", {
					currentSong: this.currentSong,
					startedAt: this.currentSong.startedAt,
					paused: this.paused,
					timePaused: this.timePaused,
					currentTime: Date.now()
				});
			});

			this.id = id;
			this.users = 0;

			function generatePlaylist(arr) {
				local.playlist = [];
				return arr.reduce((promise, id) => {
					return promise.then(() => {
						return global.db.song.find({ id }, (err, song) => {
							if (err) throw err;
							local.playlist.push(song[0]);
						});
					});
				}, Promise.resolve());
			}

			generatePlaylist(data.playlist).then(() => {
				local.currentSongIndex = data.currentSongIndex;
				local.paused = data.paused;
				local.displayName = data.displayName;
				local.description = data.description;

				local.timePaused = 0;
				local.timer = undefined;
				local.currentSong = local.playlist[this.currentSongIndex];

				local.nextSong();
			});
		}

		nextSong() {
			if (this.playlist.length > 0) {
				if (this.timer !== undefined) this.timer.pause();

				if (this.currentSongIndex + 1 <= this.playlist.length - 1) {
					this.currentSongIndex++;
				} else {
					this.currentSongIndex = 0;
				}

				this.currentSong = this.playlist[this.currentSongIndex];

				let self = this;
				this.timer = new global.Timer(() => {
					self.nextSong();
				}, this.currentSong.duration, this.paused);

				this.timePaused = 0;
				this.currentSong.startedAt = Date.now();
				this.nsp.emit("nextSong", this.currentSong, this.currentSong.startedAt);
			}
		}

		pause() {
			if (!this.paused) {
				this.paused = true;
				this.timer.pause();
				this.nsp.emit("pause");
			}
		}

		unPause() {
			if (this.paused) {
				this.paused = false;
				this.timer.resume();
				this.timePaused += this.timer.getTimePaused();
				this.nsp.emit("unpause", this.timePaused);
			}
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

		getTimePaused() {
			return this.timePaused + this.timer.getTimePaused();
		}
	},
	addStation: (station) => {
		stations.push(station);
	},
	getStation: id => {
		let result;
		stations.forEach(function(station) {
			if (station.id === id) {
				result = station;
			}
		});
		return result;
	},
	// Returns stations list when POSTing to '/stations'
	getStations: () => {
		return stations;
	}
};
