import async from "async";

import { isLoginRequired } from "./hooks";
import db from "../db";
import utils from "../utils";

// const logger = moduleManager.modules["logger"];

export default {
	/**
	 * Gets a set of activities
	 *
	 * @param {object} session - user session
	 * @param {string} userId - the user whose activities we are looking for
	 * @param {number} set - the set number to return
	 * @param {Function} cb - callback
	 */
	getSet: async (session, userId, set, cb) => {
		const activityModel = await db.runJob("GET_MODEL", {
			modelName: "activity"
		});
		async.waterfall(
			[
				next => {
					activityModel
						.find({ userId, hidden: false })
						.skip(15 * (set - 1))
						.limit(15)
						.sort("createdAt")
						.exec(next);
				}
			],
			async (err, activities) => {
				if (err) {
					err = await utils.runJob("GET_ERROR", { error: err });
					console.log("ERROR", "ACTIVITIES_GET_SET", `Failed to get set ${set} from activities. "${err}"`);
					return cb({ status: "failure", message: err });
				}

				console.log("SUCCESS", "ACTIVITIES_GET_SET", `Set ${set} from activities obtained successfully.`);
				return cb({ status: "success", data: activities });
			}
		);
	},

	/**
	 * Hides an activity for a user
	 *
	 * @param session
	 * @param {string} activityId - the activity which should be hidden
	 * @param cb
	 */
	hideActivity: isLoginRequired(async (session, activityId, cb) => {
		const activityModel = await db.runJob("GET_MODEL", {
			modelName: "activity"
		});
		async.waterfall(
			[
				next => {
					activityModel.updateOne({ _id: activityId }, { $set: { hidden: true } }, next);
				}
			],
			async err => {
				if (err) {
					err = await utils.runJob("GET_ERROR", { error: err });
					console.log("ERROR", "ACTIVITIES_HIDE_ACTIVITY", `Failed to hide activity ${activityId}. "${err}"`);
					return cb({ status: "failure", message: err });
				}

				console.log("SUCCESS", "ACTIVITIES_HIDE_ACTIVITY", `Successfully hid activity ${activityId}.`);
				return cb({ status: "success" });
			}
		);
	})
};
