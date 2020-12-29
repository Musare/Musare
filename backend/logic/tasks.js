import async from "async";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import CoreClass from "../core";
import Timer from "../classes/Timer.class";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class TasksModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("tasks");

		this.tasks = {};
	}

	/**
	 * Initialises the tasks module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	initialize() {
		return new Promise(resolve => {
			// return reject(new Error("Not fully migrated yet."));

			this.cache = this.moduleManager.modules.cache;
			this.stations = this.moduleManager.modules.stations;
			this.notifications = this.moduleManager.modules.notifications;
			this.utils = this.moduleManager.modules.utils;

			// this.createTask("testTask", testTask, 5000, true);

			this.runJob("CREATE_TASK", {
				name: "stationSkipTask",
				fn: this.checkStationSkipTask,
				timeout: 1000 * 60 * 30
			});

			this.runJob("CREATE_TASK", {
				name: "sessionClearTask",
				fn: this.sessionClearingTask,
				timeout: 1000 * 60 * 60 * 6
			});

			this.runJob("CREATE_TASK", {
				name: "logFileSizeCheckTask",
				fn: this.logFileSizeCheckTask,
				timeout: 1000 * 60 * 60
			});

			resolve();
		});
	}

	/**
	 * Creates a new task
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.name - the name of the task
	 * @param {string} payload.fn - the function the task will run
	 * @param {string} payload.paused - if the task is currently paused
	 * @param {boolean} payload.timeout - how often to run the task
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	CREATE_TASK(payload) {
		return new Promise((resolve, reject) => {
			this.tasks[payload.name] = {
				name: payload.name,
				fn: payload.fn,
				timeout: payload.timeout,
				lastRan: 0,
				timer: null
			};

			if (!payload.paused) {
				this.runJob("RUN_TASK", { name: payload.name })
					.then(() => resolve())
					.catch(err => reject(err));
			} else resolve();
		});
	}

	/**
	 * Pauses a task
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.taskName - the name of the task to pause
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	PAUSE_TASK(payload) {
		const taskName = { payload };

		return new Promise(resolve => {
			if (this.tasks[taskName].timer) this.tasks[taskName].timer.pause();
			resolve();
		});
	}

	/**
	 * Resumes a task
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.name - the name of the task to resume
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	RESUME_TASK(payload) {
		return new Promise(resolve => {
			this.tasks[payload.name].timer.resume();
			resolve();
		});
	}

	/**
	 * Runs a task's function and restarts the timer
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.name - the name of the task to run
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	RUN_TASK(payload) {
		return new Promise(resolve => {
			const task = this.tasks[payload.name];
			if (task.timer) task.timer.pause();

			task.fn.apply(this).then(() => {
				task.lastRan = Date.now();
				task.timer = new Timer(() => this.runJob("RUN_TASK", { name: payload.name }), task.timeout, false);
				resolve();
			});
		});
	}

	/**
	 * Periodically checks if any stations need to be skipped
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	checkStationSkipTask() {
		return new Promise(resolve => {
			this.log("INFO", "TASK_STATIONS_SKIP_CHECK", `Checking for stations to be skipped.`, false);
			async.waterfall(
				[
					next => {
						this.cache
							.runJob("HGETALL", { table: "stations" })
							.then(response => next(null, response))
							.catch(next);
					},
					(stations, next) => {
						async.each(
							stations,
							(station, next2) => {
								if (station.paused || !station.currentSong || !station.currentSong.title)
									return next2();
								const timeElapsed = Date.now() - station.startedAt - station.timePaused;
								if (timeElapsed <= station.currentSong.duration) return next2();

								this.log(
									"ERROR",
									"TASK_STATIONS_SKIP_CHECK",
									`Skipping ${station._id} as it should have skipped already.`
								);
								return this.stations
									.runJob("INITIALIZE_STATION", {
										stationId: station._id
									})
									.then(() => next2());
							},
							() => next()
						);
					}
				],
				() => resolve()
			);
		});
	}

	/**
	 * Periodically checks if any sessions are out of date and need to be cleared
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	sessionClearingTask() {
		return new Promise(resolve => {
			this.log("INFO", "TASK_SESSION_CLEAR", `Checking for sessions to be cleared.`);

			async.waterfall(
				[
					next => {
						this.cache
							.runJob("HGETALL", { table: "sessions" })
							.then(sessions => next(null, sessions))
							.catch(next);
					},
					(sessions, next) => {
						if (!sessions) return next();

						const keys = Object.keys(sessions);

						return async.each(
							keys,
							(sessionId, next2) => {
								const session = sessions[sessionId];

								if (
									session &&
									session.refreshDate &&
									Date.now() - session.refreshDate < 60 * 60 * 24 * 30 * 1000
								)
									return next2();

								if (!session) {
									this.log("INFO", "TASK_SESSION_CLEAR", "Removing an empty session.");
									return this.cache
										.runJob("HDEL", {
											table: "sessions",
											key: sessionId
										})
										.finally(() => {
											next2();
										});
								}
								if (!session.refreshDate) {
									session.refreshDate = Date.now();
									return this.cache
										.runJob("HSET", {
											table: "sessions",
											key: sessionId,
											value: session
										})
										.finally(() => next2());
								}
								if (Date.now() - session.refreshDate > 60 * 60 * 24 * 30 * 1000) {
									return this.utils
										.runJob("SOCKETS_FROM_SESSION_ID", {
											sessionId: session.sessionId
										})
										.then(response => {
											if (response.sockets.length > 0) {
												session.refreshDate = Date.now();
												this.cache
													.runJob("HSET", {
														table: "sessions",
														key: sessionId,
														value: session
													})
													.finally(() => {
														next2();
													});
											} else {
												this.log(
													"INFO",
													"TASK_SESSION_CLEAR",
													`Removing session ${sessionId} for user ${session.userId} since inactive for 30 days and not currently in use.`
												);
												this.cache
													.runJob("HDEL", {
														table: "sessions",
														key: session.sessionId
													})
													.finally(() => next2());
											}
										});
								}
								this.log("ERROR", "TASK_SESSION_CLEAR", "This should never log.");
								return next2();
							},
							() => next()
						);
					}
				],
				() => resolve()
			);
		});
	}

	/**
	 * Periodically warns about the size of any log files
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	logFileSizeCheckTask() {
		return new Promise((resolve, reject) => {
			this.log("INFO", "TASK_LOG_FILE_SIZE_CHECK", `Checking the size for the log files.`);
			async.each(
				["all.log", "debugStation.log", "error.log", "info.log", "success.log"],
				(fileName, next) => {
					try {
						const stats = fs.statSync(path.resolve(__dirname, "../../log/", fileName));
						const mb = stats.size / 1000000;
						if (mb > 25) return next(true);

						return next();
					} catch (err) {
						return next(err);
					}
				},
				async err => {
					if (err && err !== true) {
						err = await this.utils.runJob("GET_ERROR", { error: err });
						return reject(new Error(err));
					}
					if (err === true) {
						this.log(
							"ERROR",
							"LOGGER_FILE_SIZE_WARNING",
							"************************************WARNING*************************************"
						);
						this.log(
							"ERROR",
							"LOGGER_FILE_SIZE_WARNING",
							"***************ONE OR MORE LOG FILES APPEAR TO BE MORE THAN 25MB****************"
						);
						this.log(
							"ERROR",
							"LOGGER_FILE_SIZE_WARNING",
							"****MAKE SURE TO REGULARLY CLEAR UP THE LOG FILES, MANUALLY OR AUTOMATICALLY****"
						);
						this.log(
							"ERROR",
							"LOGGER_FILE_SIZE_WARNING",
							"********************************************************************************"
						);
					}

					return resolve();
				}
			);
		});
	}
}

export default new TasksModule();
