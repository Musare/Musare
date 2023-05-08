import async from "async";

import { useHasPermission, getUserPermissions } from "../hooks/hasPermission";

// eslint-disable-next-line
import moduleManager from "../../index";

const UtilsModule = moduleManager.modules.utils;
const WSModule = moduleManager.modules.ws;

export default {
	getModules: useHasPermission("utils.getModules", function getModules(session, cb) {
		async.waterfall(
			[
				next => {
					next(null, UtilsModule.moduleManager.modules);
				},

				(modules, next) => {
					next(
						null,
						Object.keys(modules).map(moduleName => {
							const module = modules[moduleName];
							return {
								name: module.name,
								status: module.status,
								stage: module.stage,
								jobsInQueue: module.jobQueue.lengthQueue(),
								jobsInProgress: module.jobQueue.lengthRunning(),
								jobsPaused: module.jobQueue.lengthPaused(),
								concurrency: module.jobQueue.concurrency
							};
						})
					);
				}
			],
			async (err, modules) => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "GET_MODULES", `User ${session.userId} failed to get modules. '${err}'`);
					cb({ status: "error", message: err });
				} else {
					this.log("SUCCESS", "GET_MODULES", `User ${session.userId} has successfully got the modules info.`);
					cb({
						status: "success",
						message: "Successfully got modules.",
						data: { modules }
					});
				}
			}
		);
	}),

	getModule: useHasPermission("utils.getModules", function getModule(session, moduleName, cb) {
		async.waterfall(
			[
				next => {
					next(null, UtilsModule.moduleManager.modules[moduleName]);
				},

				({ jobStatistics, jobQueue }, next) => {
					const taskMapFn = runningTask => ({
						name: runningTask.job.name,
						uniqueId: runningTask.job.uniqueId,
						status: runningTask.job.status,
						priority: runningTask.priority,
						parentUniqueId: runningTask.job.parentJob?.uniqueId ?? "N/A",
						parentName: runningTask.job.parentJob?.name ?? "N/A"
					});
					next(null, {
						jobStatistics,
						runningTasks: jobQueue.runningTasks.map(taskMapFn),
						pausedTasks: jobQueue.pausedTasks.map(taskMapFn),
						queuedTasks: jobQueue.queue.map(taskMapFn)
					});
				}
			],
			async (err, data) => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "GET_MODULE", `User ${session.userId} failed to get module. '${err}'`);
					cb({ status: "error", message: err });
				} else {
					this.log("SUCCESS", "GET_MODULE", `User ${session.userId} has successfully got the module info.`);
					cb({
						status: "success",
						message: "Successfully got module info.",
						data
					});
				}
			}
		);
	}),

	getRooms(session, cb) {
		WSModule.runJob("GET_ROOMS_FOR_SOCKET", { socketId: session.socketId })
			.then(response => {
				this.log("SUCCESS", "GET_ROOMS", `User ${session.userId} has successfully got the module info.`);
				cb({
					status: "success",
					message: "Successfully got rooms.",
					data: {
						rooms: response
					}
				});
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log("ERROR", "GET_ROOMS", `Failed to get rooms. '${err}'`);
				cb({ status: "error", message: err });
			});
	},

	/**
	 * Get permissions
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} stationId - optional, the station id
	 * @param {Function} cb - gets called with the result
	 */
	async getPermissions(session, stationId, cb) {
		const callback = cb || stationId;
		async.waterfall(
			[
				next => {
					getUserPermissions(session.userId, cb ? stationId : null)
						.then(permissions => {
							next(null, permissions);
						})
						.catch(() => {
							next(null, {});
						});
				}
			],
			async (err, permissions) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "GET_PERMISSIONS", `Fetching permissions failed. "${err}"`);
					return callback({ status: "error", message: err });
				}
				this.log("SUCCESS", "GET_PERMISSIONS", "Fetching permissions was successful.");
				return callback({ status: "success", data: { permissions } });
			}
		);
	}
};
