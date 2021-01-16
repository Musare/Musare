import async from "async";

import { isAdminRequired } from "./hooks";

import moduleManager from "../../index";

const UtilsModule = moduleManager.modules.utils;

export default {
	getModules: isAdminRequired(function getModules(session, cb) {
		async.waterfall(
			[
				next => {
					next(null, UtilsModule.moduleManager.modules);
				},

				(modules, next) => {
					// this.log(modules, next);
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
					cb({ status: "failure", message: err });
				} else {
					this.log("SUCCESS", "GET_MODULES", `User ${session.userId} has successfully got the modules info.`);
					cb({
						status: "success",
						message: "Successfully got modules.",
						modules
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
				// this.log(module.runningJobs);
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "GET_MODULE", `User ${session.userId} failed to get module. '${err}'`);
					cb({ status: "failure", message: err });
				} else {
					this.log("SUCCESS", "GET_MODULE", `User ${session.userId} has successfully got the module info.`);
					cb({
						status: "success",
						message: "Successfully got module info.",
						// runningTasks: module.jobQueue.runningTasks,
						// pausedTasks: module.jobQueue.pausedTasks,
						// queuedTasks: module.jobQueue.queue,
						jobStatistics: module.jobStatistics
					});
				}
			}
		);
	})
};
