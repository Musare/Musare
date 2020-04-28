"use strict";

const async = require("async");

const hooks = require("./hooks");

const db = require("../db");
const utils = require("../utils");
const activities = require("../activities");

// const logger = moduleManager.modules["logger"];

module.exports = {
    /**
     * Gets a set of activities
     *
     * @param session
     * @param {String} userId - the user whose activities we are looking for
     * @param {Integer} set - the set number to return
     * @param cb
     */
    getSet: async (session, userId, set, cb) => {
        const activityModel = await db.runJob("GET_MODEL", {
            modelName: "activity",
        });
        async.waterfall(
            [
                (next) => {
                    activityModel
                        .find({ userId, hidden: false })
                        .skip(15 * (set - 1))
                        .limit(15)
                        .sort("createdAt")
                        .exec(next);
                },
            ],
            async (err, activities) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "ACTIVITIES_GET_SET",
                        `Failed to get set ${set} from activities. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }

                console.log(
                    "SUCCESS",
                    "ACTIVITIES_GET_SET",
                    `Set ${set} from activities obtained successfully.`
                );
                cb({ status: "success", data: activities });
            }
        );
    },

    /**
     * Hides an activity for a user
     *
     * @param session
     * @param {String} activityId - the activity which should be hidden
     * @param cb
     */
    hideActivity: hooks.loginRequired(async (session, activityId, cb) => {
        const activityModel = await db.runJob("GET_MODEL", {
            modelName: "activity",
        });
        async.waterfall(
            [
                (next) => {
                    activityModel.updateOne(
                        { _id: activityId },
                        { $set: { hidden: true } },
                        next
                    );
                },
            ],
            async (err) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "ACTIVITIES_HIDE_ACTIVITY",
                        `Failed to hide activity ${activityId}. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }

                console.log(
                    "SUCCESS",
                    "ACTIVITIES_HIDE_ACTIVITY",
                    `Successfully hid activity ${activityId}.`
                );
                cb({ status: "success" });
            }
        );
    }),
};
