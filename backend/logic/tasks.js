'use strict';

const coreClass = require("../core");

const async = require("async");
const fs = require("fs");

let tasks = {};

module.exports = class extends coreClass {
	initialize() {
		return new Promise((resolve, reject) => {
			this.setStage(1);
			
			this.cache = this.moduleManager.modules["cache"];
			this.stations = this.moduleManager.modules["stations"];
			this.notifications = this.moduleManager.modules["notifications"];
			this.utils = this.moduleManager.modules["utils"];

			//this.createTask("testTask", testTask, 5000, true);
			this.createTask("stationSkipTask", this.checkStationSkipTask, 1000 * 60 * 30);
			this.createTask("sessionClearTask", this.sessionClearingTask, 1000 * 60 * 60 * 6);
			this.createTask("logFileSizeCheckTask", this.logFileSizeCheckTask, 1000 * 60 * 60);

			resolve();
		});
	}

	async createTask(name, fn, timeout, paused = false) {
		try { await this._validateHook(); } catch { return; }

		tasks[name] = {
			name,
			fn,
			timeout,
			lastRan: 0,
			timer: null
		};
		if (!paused) this.handleTask(tasks[name]);
	}

	async pauseTask(name) {
		try { await this._validateHook(); } catch { return; }

		if (tasks[name].timer) tasks[name].timer.pause();
	}

	async resumeTask(name) {
		try { await this._validateHook(); } catch { return; }

		tasks[name].timer.resume();
	}

	async handleTask(task) {
		try { await this._validateHook(); } catch { return; }

		if (task.timer) task.timer.pause();
		
		task.fn.apply(this, [
			() => {
				task.lastRan = Date.now();
				task.timer = new this.utils.Timer(() => {
					this.handleTask(task);
				}, task.timeout, false);
			}
		]);
	}

	/*testTask(callback) {
		//Stuff
		console.log("Starting task");
		setTimeout(() => {
			console.log("Callback");
			callback();
		}, 10000);
	}*/

	async checkStationSkipTask(callback) {
		this.logger.info("TASK_STATIONS_SKIP_CHECK", `Checking for stations to be skipped.`, false);
		async.waterfall([
			(next) => {
				this.cache.hgetall('stations', next);
			},
			(stations, next) => {
				async.each(stations, (station, next2) => {
					if (station.paused || !station.currentSong || !station.currentSong.title) return next2();
					const timeElapsed = Date.now() - station.startedAt - station.timePaused;
					if (timeElapsed <= station.currentSong.duration) return next2();
					else {
						this.logger.error("TASK_STATIONS_SKIP_CHECK", `Skipping ${station._id} as it should have skipped already.`);
						this.stations.initializeStation(station._id);
						next2();
					}
				}, () => {
					next();
				});
			}
		], () => {
			callback();
		});
	}

	async sessionClearingTask(callback) {
		this.logger.info("TASK_SESSION_CLEAR", `Checking for sessions to be cleared.`, false);
		async.waterfall([
			(next) => {
				this.cache.hgetall('sessions', next);
			},
			(sessions, next) => {
				if (!sessions) return next();
				let keys = Object.keys(sessions);
				async.each(keys, (sessionId, next2) => {
					let session = sessions[sessionId];
					if (session && session.refreshDate && (Date.now() - session.refreshDate) < (60 * 60 * 24 * 30 * 1000)) return next2();
					if (!session) {
						this.logger.info("TASK_SESSION_CLEAR", 'Removing an empty session.');
						this.cache.hdel('sessions', sessionId, () => {
							next2();
						});
					} else if (!session.refreshDate) {
						session.refreshDate = Date.now();
						this.cache.hset('sessions', sessionId, session, () => {
							next2();
						});
					} else if ((Date.now() - session.refreshDate) > (60 * 60 * 24 * 30 * 1000)) {
						this.utils.socketsFromSessionId(session.sessionId, (sockets) => {
							if (sockets.length > 0) {
								session.refreshDate = Date.now();
								this.cache.hset('sessions', sessionId, session, () => {
									next2()
								});
							} else {
								this.logger.info("TASK_SESSION_CLEAR", `Removing session ${sessionId} for user ${session.userId} since inactive for 30 days and not currently in use.`);
								this.cache.hdel('sessions', session.sessionId, () => {
									next2();
								});
							}
						});
					} else {
						this.logger.error("TASK_SESSION_CLEAR", "This should never log.");
						next2();
					}
				}, () => {
					next();
				});
			}
		], () => {
			callback();
		});
	}

	async logFileSizeCheckTask(callback) {
		this.logger.info("TASK_LOG_FILE_SIZE_CHECK", `Checking the size for the log files.`);
		async.each(
			["all.log", "debugStation.log", "error.log", "info.log", "success.log"],
			(fileName, next) => {
				const stats = fs.statSync(`${__dirname}/../../log/${fileName}`);
				const mb = stats.size / 1000000;
				if (mb > 25) return next(true);
				else next();
			},
			(err) => {
				if (err === true) {
					this.logger.error("LOGGER_FILE_SIZE_WARNING", "************************************WARNING*************************************");
					this.logger.error("LOGGER_FILE_SIZE_WARNING", "***************ONE OR MORE LOG FILES APPEAR TO BE MORE THAN 25MB****************");
					this.logger.error("LOGGER_FILE_SIZE_WARNING", "****MAKE SURE TO REGULARLY CLEAR UP THE LOG FILES, MANUALLY OR AUTOMATICALLY****");
					this.logger.error("LOGGER_FILE_SIZE_WARNING", "********************************************************************************");
				}
				callback();
			}
		);
	}
}
