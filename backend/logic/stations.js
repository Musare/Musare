'use strict';

const global = require('./global');
let io = global.io;

module.exports = class Station {
	constructor(id, data) {
		this.nsp = io.of('/' + id);
		this.nsp.on('connection', socket => {
			console.info('someone connected');
		});
		this.id = id;
		this.data = data;

		this.playlist = data.playlist;
		this.currentSong = this.playlist[0];
		this.currentSongIndex = data.currentSongIndex;
		this.paused = data.paused;
		this.locked = data.locked;
		this.skipVotes = data.skipVotes;
		this.users = data.users;
		this.displayName = data.displayName;
		this.description = data.description;
		this.timer = undefined;
	}

	skipSong() {
		if (this.playlist.length > 0) {
			if (this.timer !== undefined) this.timer.pause();

			if (this.currentSongIndex+1 < this.playlist.length) this.currentSongIndex++;
			else this.currentSongIndex = 0;

			this.skipVotes = 0;
			this.currentSong = this.playlist[this.currentSongIndex];

			this.timer = new global.Timer(() => {
				console.log("Skip!");
				self.skipSong();
			}, this.currentSong.duration, this.paused);

			nsp.emit("skippedSong", this.currentSong);
		}
	}

	toggleVoteSkip(userId) {
		if (this.skipVotes.indexOf(userId) === -1) this.skipVotes.push(userId);
		else this.skipVotes = this.skipVotes.splice(this.skipVotes.indexOf(userId), 1);

		// TODO: Calculate if enough people voted to skip
		nsp.emit("voteSkip", this.skipVotes);
	}

	retrievePlaylist() {
		// TODO: get the Playlist for this station using db
	}

	pause() {
		if (!this.paused) {
			this.paused = true;
			this.timer.pause();
			nsp.emit("pause");
		}
	}

	unPause() {
		if (this.paused) {
			this.paused = false;
			this.timer.resume();
			nsp.emit("unpause");
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
			nsp.emit("lock");
		}
	}

	unlock() {
		if (this.locked) {
			this.locked = false;
			nsp.emit("unlocked");
		}
	}

	isLocked() {
		return this.locked;
	}

	updateDisplayName(newDisplayName) {
		// TODO: Update db
		this.displayName = newDisplayName;
		nsp.emit("updateDisplayName", newDisplayName);
	}

	updateDescription(newDescription) {
		// TODO: Update db
		this.description = newDescription;
		nsp.emit("updateDescription", newDescription);
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
		nsp.emit("updateUsers", this.users);
	}

	removeUser(user) {
		this.users.splice(this.users.indexOf(user), 1);
		nsp.emit("updateUsers", this.users);
	}

	getUsers() {
		return this.users;
	}

}
