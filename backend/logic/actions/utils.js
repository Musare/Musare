import async from "async";

import { isAdminRequired } from "./hooks";

import moduleManager from "../../index";

const UtilsModule = moduleManager.modules.utils;
const WSModule = moduleManager.modules.ws;

export default {
	getModules: isAdminRequired(function getModules(session, cb) {
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

	getModule: isAdminRequired(function getModule(session, moduleName, cb) {
		async.waterfall(
			[
				next => {
					next(null, UtilsModule.moduleManager.modules[moduleName]);
				}
			],
			async (err, module) => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "GET_MODULE", `User ${session.userId} failed to get module. '${err}'`);
					cb({ status: "error", message: err });
				} else {
					this.log("SUCCESS", "GET_MODULE", `User ${session.userId} has successfully got the module info.`);
					cb({
						status: "success",
						message: "Successfully got module info.",
						data: {
							jobStatistics: module.jobStatistics
						}
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
	}
};
