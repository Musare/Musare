'use strict';

////////////////////////////////////////////////////////////////////
// This way of storing the state of a station is very OOP based   //
// and is likely to not scale very efficiently. A more functional //
// approach is needed. As in, the 'state' of a station should be  //
// purely data based. Actions on Stations should operate directly //
// on stored data, not on in-memory representations of them       //
////////////////////////////////////////////////////////////////////

const Promise = require('bluebird');
const io = globals.io;
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
					startedAt: this.startedAt,
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
						return globals.db.models.song.find({ id }, (err, song) => {
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
				if (local.playlist[this.currentSongIndex]) {
					local.currentSong = local.playlist[this.currentSongIndex];
					local.nextSong();
				}
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
				this.timer = new globals.utils.Timer(() => {
					self.nextSong();
				}, this.currentSong.duration, this.paused);

				this.timePaused = 0;
				this.startedAt = Date.now();
				this.nsp.emit("nextSong", this.currentSong, this.startedAt);
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

		getTimePaused() {
			return this.timePaused + this.timer.getTimePaused();
		}
	},
	addStation: station => stations.push(station),
	getStation: id => stations.find(station => station.id === id),
	getStations: _ => stations
};
