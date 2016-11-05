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
				// socket.on("pause", () => {
				// 	local.pause();
				// });

				// socket.on("unpause", () => {
				// 	local.unPause();
				// });

				socket.emit("connected", {
					currentSong: this.currentSong,
					paused: this.paused,
					timePaused: this.timePaused,
					currentTime: Date.now()
				});
			});

			this.id = id;
			this.playlist = data.playlist;
			this.currentSongIndex = data.currentSongIndex;
			this.paused = data.paused;
			this.displayName = data.displayName;
			this.description = data.description;

			this.timePaused = 0;
			this.timer = undefined;
			this.currentSong = this.playlist[this.currentSongIndex];

			this.nextSong();
		}

		nextSong() {
			if (this.playlist.length > 0) {
				if (this.timer !== undefined) this.timer.pause();

				if (this.currentSongIndex + 1 < this.playlist.length) {
					this.currentSongIndex++;
				}
				else {
					this.currentSongIndex = 0;
				}

				this.currentSong = this.playlist[this.currentSongIndex];

				let self = this;
				this.timer = new global.Timer(() => {
					self.nextSong();
				}, this.currentSong.duration, this.paused);

				this.timePaused = 0;
				this.currentSong.startedAt = Date.now();
				this.nsp.emit("nextSong", this.currentSong);
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

		// isPaused() {
		// 	return this.paused;
		// }

		// getCurrentSong() {
		// 	return this.currentSong;
		// }

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
	// getStation: id => {
	// 	let result;
	// 	stations.forEach(function(station) {
	// 		if (station.getId() === id) {
	// 			result = station;
	// 		}
	// 	});
	// 	return result;
	// },
	// Returns stations list when POSTing to '/stations'
	getStations: () => {
		return stations;
	}
};
