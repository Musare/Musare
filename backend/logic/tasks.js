'use strict';

const cache = require("./cache");
const logger = require("./logger");
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
	logger.info("TASK_STATIONS_SKIP_CHECK", `Checking for stations to be skipped.`);
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
					logger.error("TASK_STATIONS_SKIP_CHECK", `Skipping ${station._id} as it should have skipped already.`);
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

let sessionClearingTask = (callback) => {
	logger.info("TASK_SESSION_CLEAR", `Checking for sessions to be cleared.`);
	async.waterfall([
		(next) => {
			cache.hgetall('sessions', next);
		},
		(sessions, next) => {
			if (!sessions) return next();
			let keys = Object.keys(sessions);
			async.each(keys, (sessionId, next2) => {
				let session = sessions[sessionId];
				if (session && session.refreshDate && (Date.now() - session.refreshDate) < (60 * 60 * 24 * 30 * 1000)) return next2();
				if (!session) {
					logger.info("TASK_SESSION_CLEAR", 'Removing an empty session.');
					cache.hdel('sessions', sessionId, () => {
						next2();
					});
				} else if (!session.refreshDate) {
					session.refreshDate = Date.now();
					cache.hset('sessions', sessionId, session, () => {
						next2();
					});
				} else if ((Date.now() - session.refreshDate) > (60 * 60 * 24 * 30 * 1000)) {
					utils.socketsFromSessionId(session.sessionId, (sockets) => {
						if (sockets.length > 0) {
							session.refreshDate = Date.now();
							cache.hset('sessions', sessionId, session, () => {
								next2()
							});
						} else {
							logger.info("TASK_SESSION_CLEAR", `Removing session ${sessionId} for user ${session.userId} since inactive for 30 days and not currently in use.`);
							cache.hdel('sessions', session.sessionId, () => {
								next2();
							});
						}
					});
				} else {
					logger.error("TASK_SESSION_CLEAR", "This should never log.");
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
		this.createTask("sessionClearTask", sessionClearingTask, 1000 * 60 * 60 * 6);

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
