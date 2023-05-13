import async from "async";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import CoreClass from "../core";
import Timer from "../classes/Timer.class";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let TasksModule;
let CacheModule;
let StationsModule;
let UtilsModule;
let WSModule;
let DBModule;

const stationStateWorth = {
	unknown: 0,
	no_song: 1,
	station_paused: 2,
	participate: 3,
	local_paused: 4,
	muted: 5,
	unavailable: 6,
	buffering: 7,
	playing: 8
};

class _TasksModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("tasks");

		this.tasks = {};

		TasksModule = this;
	}

	/**
	 * Initialises the tasks module
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	initialize() {
		return new Promise(resolve => {
			CacheModule = this.moduleManager.modules.cache;
			StationsModule = this.moduleManager.modules.stations;
			UtilsModule = this.moduleManager.modules.utils;
			WSModule = this.moduleManager.modules.ws;
			DBModule = this.moduleManager.modules.db;

			TasksModule.runJob("CREATE_TASK", {
				name: "stationSkipTask",
				fn: TasksModule.checkStationSkipTask,
				timeout: 1000 * 60 * 30
			});

			TasksModule.runJob("CREATE_TASK", {
				name: "sessionClearTask",
				fn: TasksModule.sessionClearingTask,
				timeout: 1000 * 60 * 60 * 6
			});

			// TasksModule.runJob("CREATE_TASK", {
			// 	name: "logFileSizeCheckTask",
			// 	fn: TasksModule.logFileSizeCheckTask,
			// 	timeout: 1000 * 60 * 60
			// });

			TasksModule.runJob("CREATE_TASK", {
				name: "collectStationUsersTask",
				fn: TasksModule.collectStationUsersTask,
				timeout: 1000 * 3
			});

			// TasksModule.runJob("CREATE_TASK", {
			//	name: "historyClearTask",
			//	fn: TasksModule.historyClearTask,
			//	timeout: 1000 * 60 * 60 * 6
			// });

			resolve();
		});
	}

	/**
	 * Creates a new task
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.name - the name of the task
	 * @param {string} payload.fn - the function the task will run
	 * @param {string} payload.paused - if the task is currently paused
	 * @param {boolean} payload.timeout - how often to run the task
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	CREATE_TASK(payload) {
		return new Promise((resolve, reject) => {
			TasksModule.tasks[payload.name] = {
				name: payload.name,
				fn: payload.fn,
				timeout: payload.timeout,
				lastRan: 0,
				timer: null
			};

			if (!payload.paused) {
				TasksModule.runJob("RUN_TASK", { name: payload.name }, this)
					.then(() => resolve())
					.catch(err => reject(err));
			} else resolve();
		});
	}

	/**
	 * Pauses a task
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.taskName - the name of the task to pause
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	PAUSE_TASK(payload) {
		const taskName = { payload };

		return new Promise(resolve => {
			if (TasksModule.tasks[taskName].timer) TasksModule.tasks[taskName].timer.pause();
			resolve();
		});
	}

	/**
	 * Resumes a task
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.name - the name of the task to resume
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	RESUME_TASK(payload) {
		return new Promise(resolve => {
			TasksModule.tasks[payload.name].timer.resume();
			resolve();
		});
	}

	/**
	 * Runs a task's function and restarts the timer
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.name - the name of the task to run
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	RUN_TASK(payload) {
		return new Promise(resolve => {
			const task = TasksModule.tasks[payload.name];
			if (task.timer) task.timer.pause();

			task.fn.apply(this).then(() => {
				task.lastRan = Date.now();
				task.timer = new Timer(
					() => TasksModule.runJob("RUN_TASK", { name: payload.name }),
					task.timeout,
					false
				);
				resolve();
			});
		});
	}

	/**
	 * Periodically checks if any stations need to be skipped
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	checkStationSkipTask() {
		return new Promise(resolve => {
			TasksModule.log("INFO", "TASK_STATIONS_SKIP_CHECK", `Checking for stations to be skipped.`, false);
			async.waterfall(
				[
					next => {
						CacheModule.runJob("HGETALL", { table: "stations" })
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

								TasksModule.log(
									"ERROR",
									"TASK_STATIONS_SKIP_CHECK",
									`Skipping ${station._id} as it should have skipped already.`
								);
								return StationsModule.runJob("INITIALIZE_STATION", {
									stationId: station._id
								}).then(() => next2());
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
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	sessionClearingTask() {
		return new Promise(resolve => {
			TasksModule.log("INFO", "TASK_SESSION_CLEAR", `Checking for sessions to be cleared.`);

			async.waterfall(
				[
					next => {
						CacheModule.runJob("HGETALL", { table: "sessions" })
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
									TasksModule.log("INFO", "TASK_SESSION_CLEAR", "Removing an empty session.");
									return CacheModule.runJob("HDEL", {
										table: "sessions",
										key: sessionId
									}).finally(() => {
										next2();
									});
								}
								if (!session.refreshDate) {
									session.refreshDate = Date.now();
									return CacheModule.runJob("HSET", {
										table: "sessions",
										key: sessionId,
										value: session
									}).finally(() => next2());
								}
								if (Date.now() - session.refreshDate > 60 * 60 * 24 * 30 * 1000) {
									return WSModule.runJob("SOCKETS_FROM_SESSION_ID", {
										sessionId: session.sessionId
									}).then(sockets => {
										if (sockets.length > 0) {
											session.refreshDate = Date.now();
											CacheModule.runJob("HSET", {
												table: "sessions",
												key: sessionId,
												value: session
											}).finally(() => {
												next2();
											});
										} else {
											TasksModule.log(
												"INFO",
												"TASK_SESSION_CLEAR",
												`Removing session ${sessionId} for user ${session.userId} since inactive for 30 days and not currently in use.`
											);
											CacheModule.runJob("HDEL", {
												table: "sessions",
												key: session.sessionId
											}).finally(() => next2());
										}
									});
								}
								TasksModule.log("ERROR", "TASK_SESSION_CLEAR", "This should never log.");
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
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	logFileSizeCheckTask() {
		return new Promise((resolve, reject) => {
			TasksModule.log("INFO", "TASK_LOG_FILE_SIZE_CHECK", `Checking the size for the log files.`);
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
						err = await UtilsModule.runJob("GET_ERROR", { error: err });
						return reject(new Error(err));
					}
					if (err === true) {
						TasksModule.log(
							"ERROR",
							"LOGGER_FILE_SIZE_WARNING",
							"************************************WARNING*************************************"
						);
						TasksModule.log(
							"ERROR",
							"LOGGER_FILE_SIZE_WARNING",
							"***************ONE OR MORE LOG FILES APPEAR TO BE MORE THAN 25MB****************"
						);
						TasksModule.log(
							"ERROR",
							"LOGGER_FILE_SIZE_WARNING",
							"****MAKE SURE TO REGULARLY CLEAR UP THE LOG FILES, MANUALLY OR AUTOMATICALLY****"
						);
						TasksModule.log(
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

	/**
	 * Periodically collect users in stations
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async collectStationUsersTask() {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" });

		return new Promise(resolve => {
			TasksModule.log("INFO", "TASK_COLLECT_STATION_USERS_TASK", `Checking for users in stations.`, false);

			const stationsCountUpdated = [];
			const stationsUpdated = [];

			const oldUsersPerStation = StationsModule.usersPerStation;
			const usersPerStation = { loggedIn: [], loggedOut: [] };

			const oldUsersPerStationCount = JSON.parse(JSON.stringify(StationsModule.usersPerStationCount));
			const usersPerStationCount = {};

			async.each(
				Object.keys(StationsModule.userList),
				(socketId, next) => {
					WSModule.runJob("SOCKET_FROM_SOCKET_ID", { socketId }).then(async socket => {
						const stationId = StationsModule.userList[socketId];
						const room = await WSModule.runJob("GET_SOCKETS_FOR_ROOM", {
							room: `station.${stationId}`
						});

						if (!socket || !room.includes(socketId)) {
							if (stationsCountUpdated.indexOf(stationId) === -1) stationsCountUpdated.push(stationId);
							if (stationsUpdated.indexOf(stationId) === -1) stationsUpdated.push(String(stationId));

							delete StationsModule.userList[socketId];

							return next();
						}

						if (!usersPerStationCount[stationId]) usersPerStationCount[stationId] = 0; // start count for station
						if (!usersPerStation[stationId]) usersPerStation[stationId] = { loggedIn: [], loggedOut: [] };

						return async.waterfall(
							[
								next => {
									if (!socket.session || !socket.session.sessionId) {
										return next("No session found.", { ip: socket.ip });
									}

									return CacheModule.runJob("HGET", {
										table: "sessions",
										key: socket.session.sessionId
									})
										.then(session => next(null, session))
										.catch(next);
								},

								(session, next) => {
									if (!session) return next("Session not found.");
									return userModel.findOne({ _id: session.userId }, next);
								},

								(user, next) => {
									if (!user) return next("User not found.");

									const state = socket.session.stationState ?? "unknown";

									const existingUserObject = usersPerStation[stationId].loggedIn.findLast(
										u => user.username === u.username
									);

									if (existingUserObject) {
										if (stationStateWorth[state] > stationStateWorth[existingUserObject.state]) {
											usersPerStation[stationId].loggedIn[
												usersPerStation[stationId].loggedIn.indexOf(existingUserObject)
											].state = state;
										}
										return next("User already in the list.");
									}

									usersPerStationCount[stationId] += 1; // increment user count for station

									return next(null, {
										_id: user._id,
										username: user.username,
										name: user.name,
										avatar: user.avatar,
										state
									});
								}
							],
							(err, user) => {
								if (!err) usersPerStation[stationId].loggedIn.push(user);

								// if user is logged out (an ip can only be counted once)
								if (
									err === "No session found." &&
									!usersPerStation[stationId].loggedOut.some(u => user.ip === u.ip)
								) {
									usersPerStationCount[stationId] += 1; // increment user count for station
									usersPerStation[stationId].loggedOut.push(user);
								}

								next();
							}
						);
					});
				},
				() => {
					Object.keys(usersPerStationCount).forEach(stationId => {
						if (
							oldUsersPerStationCount[stationId] !== usersPerStationCount[stationId] &&
							stationsCountUpdated.indexOf(stationId) === -1
						) {
							this.log("INFO", "UPDATE_STATION_USER_COUNT", `Updating user count of ${stationId}.`);

							CacheModule.runJob("PUB", {
								channel: "station.updateUserCount",
								value: { stationId, usersPerStationCount: usersPerStationCount[stationId] }
							});
						}
					});

					Object.keys(usersPerStation).forEach(stationId => {
						if (
							!oldUsersPerStation[stationId] ||
							JSON.stringify(oldUsersPerStation[stationId]) !==
								JSON.stringify(usersPerStation[stationId]) ||
							oldUsersPerStationCount[stationId] !== usersPerStationCount[stationId]
						) {
							this.log("INFO", "UPDATE_STATION_USER_LIST", `Updating user list of ${stationId}.`);

							CacheModule.runJob("PUB", {
								channel: "station.updateUsers",
								value: { stationId, usersPerStation: usersPerStation[stationId] }
							});
						}
					});

					StationsModule.usersPerStationCount = usersPerStationCount;
					StationsModule.usersPerStation = usersPerStation;
				}
			);

			resolve();
		});
	}

	/**
	 * Periodically removes any old history documents
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async historyClearTask() {
		TasksModule.log("INFO", "TASK_HISTORY_CLEAR", `Removing old history.`);

		const stationHistoryModel = await DBModule.runJob("GET_MODEL", { modelName: "stationHistory" });

		// Remove documents created more than 2 days ago
		const mongoQuery = { "payload.skippedAt": { $lt: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 2) } };

		const count = await stationHistoryModel.count(mongoQuery);

		await stationHistoryModel.remove(mongoQuery);

		TasksModule.log("SUCCESS", "TASK_HISTORY_CLEAR", `Removed ${count} history items`);
	}
}

export default new _TasksModule();
