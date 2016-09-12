'use strict';

class Timer {
	constructor(callback, delay, paused) {
		this.callback = callback;
		this.delay = delay;
		this.paused = paused;

		this.timerId = delay;
		this.start = delay;
		this.remaining = delay;
		this.timeWhenPaused = 0;
		this.timePaused = Date.now();
	}

	pause() {
		clearTimeout(this.timerId);
		this.remaining -= Date.now() - this.start;
		this.timePaused = Date.now();
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
	}

	resetTimeWhenPaused() {
		this.timeWhenPaused = 0;
	}

	timeWhenPaused() {
		return this.timeWhenPaused;
	}
}

module.exports = {
	io: null, // Socket.io
	db: null, // Database
	htmlEntities: (str) => {
		return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	},
	Timer
};
