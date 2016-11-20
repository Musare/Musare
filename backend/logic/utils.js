'use strict';

const moment = require('moment');

class Timer {
	constructor(callback, delay, paused) {
		this.callback = callback;
		this.timerId = undefined;
		this.start = undefined;
		this.paused = paused;
		this.remaining = moment.duration(delay, "hh:mm:ss").asSeconds() * 1000;
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

function convertTime (duration) {

	let a = duration.match(/\d+/g);

	if (duration.indexOf('M') >= 0 && duration.indexOf('H') == -1 && duration.indexOf('S') == -1) {
		a = [0, a[0], 0];
	}

	if (duration.indexOf('H') >= 0 && duration.indexOf('M') == -1) {
		a = [a[0], 0, a[1]];
	}
	if (duration.indexOf('H') >= 0 && duration.indexOf('M') == -1 && duration.indexOf('S') == -1) {
		a = [a[0], 0, 0];
	}

	duration = 0;

	if (a.length == 3) {
		duration = duration + parseInt(a[0]) * 3600;
		duration = duration + parseInt(a[1]) * 60;
		duration = duration + parseInt(a[2]);
	}

	if (a.length == 2) {
		duration = duration + parseInt(a[0]) * 60;
		duration = duration + parseInt(a[1]);
	}

	if (a.length == 1) {
		duration = duration + parseInt(a[0]);
	}

	let hours = Math.floor(duration / 3600);
	let minutes = Math.floor(duration % 3600 / 60);
	let seconds = Math.floor(duration % 3600 % 60);

	return (hours < 10 ? ("0" + hours + ":") : (hours + ":")) + (minutes < 10 ? ("0" + minutes + ":") : (minutes + ":")) + (seconds < 10 ? ("0" + seconds) : seconds);
}

module.exports = {
	htmlEntities: str => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
	generateRandomString: function(len) {
		let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
		let result = [];
		for (let i = 0; i < len; i++) {
			result.push(chars[this.getRandomNumber(0, chars.length - 1)]);
		}
		return result.join("");
	},
	getSocketFromId: function(socketId) {
		return globals.io.sockets.sockets[socketId];
	},
	getRandomNumber: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
	convertTime,
	Timer,
	guid: () => [1,1,0,1,0,1,0,1,0,1,1,1].map(b => b ? Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1) : '-').join('')
};
