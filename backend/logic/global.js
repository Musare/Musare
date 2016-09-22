'use strict';

class Timer {
	constructor(callback, delay, paused) {
		this.callback = callback;
		this.timerId = undefined;
		this.start = undefined;
		this.paused = paused;
		this.remaining = delay * 1000;
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

function getRandomNumber(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
	io: null, // Socket.io
	db: null, // Database
	htmlEntities: str => {
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	},
	getRandomNumber,
	generateRandomString: len => {
		let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
		let result = [];
		for (let i = 0; i < len; i++) {
			result.push(chars[getRandomNumber(0, chars.length - 1)]);
		}
		return result.join("");
	},
	getSocketFromId: function(socketId) {
		return this.io.sockets.sockets[socketId];
	},
	Timer
};
