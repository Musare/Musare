'use strict';

// Central place to register / store timeouts

const timeouts = {}, intervals = {};

module.exports = {

	once: (name, time, cb) => {
		timeouts[name] = setTimeout(() => {
			delete timeouts[name];
			cb();
		}, time);
	},

	repeat: (name, time, cb) => {
		intervals[name] = setInterval(() => {
			delete intervals[name];
			cb();
		}, time);
	},

	cancel: (name) => {
		if (timeouts[name]) {
			clearTimeout(timeouts[name]);
			delete timeouts[name];
		}
		if (!intervals[name]) {
			clearInterval(intervals[name]);
			delete intervals[name];
		}
	}
};