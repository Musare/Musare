"use strict";

const async = require("async");

const hooks = require("./hooks");

const utils = require("../utils");

module.exports = {
    getModules: hooks.adminRequired((session, cb) => {
        async.waterfall(
            [
                (next) => {
                    next(null, utils.moduleManager.modules);
                },

                (modules, next) => {
                    console.log(modules, next);
                    next(
                        null,
                        Object.keys(modules).map((moduleName) => {
                            const module = modules[moduleName];
                            return {
                                name: module.name,
                                status: module.status,
                                stage: module.stage,
                                jobsInQueue: module.jobQueue.length(),
                                jobsInProgress: module.jobQueue.running(),
                                concurrency: module.jobQueue.concurrency,
                            };
                        })
                    );
                },
            ],
            async (err, modules) => {
                if (err && err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "GET_MODULES",
                        `User ${session.userId} failed to get modules. '${err}'`
                    );
                    cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "GET_MODULES",
                        `User ${session.userId} has successfully got the modules info.`
                    );
                    cb({
                        status: "success",
                        message: "Successfully got modules.",
                        modules,
                    });
                }
            }
        );
    }),

    getModule: hooks.adminRequired((session, moduleName, cb) => {
        async.waterfall(
            [
                (next) => {
                    next(null, utils.moduleManager.modules[moduleName]);
                },
            ],
            async (err, module) => {
                console.log(module.runningJobs);
                if (err && err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "GET_MODULE",
                        `User ${session.userId} failed to get module. '${err}'`
                    );
                    cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "GET_MODULE",
                        `User ${session.userId} has successfully got the module info.`
                    );
                    cb({
                        status: "success",
                        message: "Successfully got module info.",
                        runningJobs: module.runningJobs,
                        jobStatistics: module.jobStatistics,
                    });
                }
            }
        );
    }),
};
