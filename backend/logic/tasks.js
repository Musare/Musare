'use strict';

const cache = require("./cache");
const Stations = require("./stations");
const async = require("async");
let utils;
let tasks = {};

let testTask = (callback) => {
	//Stuff
	console.log("Starting task");
	setTimeout(() => {
		console.log("Callback");
		callback();
	}, 10000);
};

let checkStationSkipTask = (callback) => {
	console.log(`Checking for stations`);
	async.waterfall([
		(next) => {
			cache.hgetall('stations', next);
		},
		(stations, next) => {
			async.each(stations, (station, next2) => {
				if (station.paused || !station.currentSong || !station.currentSong.title) return next2();
				const timeElapsed = Date.now() - station.startedAt - station.timePaused;
				if (timeElapsed <= station.currentSong.duration) return next2();
				else {
					console.log(`Skipping ${station._id}`);
					stations.skipStation(station._id);
					next2();
				}
			}, () => {
				next();
			});
		}
	], () => {
		callback();
	});
};

module.exports = {
	init: function(cb) {
		utils = require('./utils');
		this.createTask("testTask", testTask, 5000, true);
		this.createTask("stationSkipTask", checkStationSkipTask, 1000 * 60 * 30);

		cb();
	},
	createTask: function(name, fn, timeout, paused = false) {
		tasks[name] = {
			name,
			fn,
			timeout,
			lastRan: 0,
			timer: null
		};
		if (!paused) this.handleTask(tasks[name]);
	},
	pauseTask: (name) => {
		tasks[name].timer.pause();
	},
	resumeTask: (name) => {
		tasks[name].timer.resume();
	},
	handleTask: function(task) {
		if (task.timer) task.timer.pause();

		task.fn(() => {
			task.lastRan = Date.now();
			task.timer = new utils.Timer(() => {
				this.handleTask(task);
			}, task.timeout, false);
		});
	}
};
