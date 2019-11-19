'use strict';

const async = require('async');

const hooks = require('./hooks');
const moduleManager = require("../../index");

const db = moduleManager.modules["db"];
const utils = moduleManager.modules["utils"];
const logger = moduleManager.modules["logger"];
const activities = moduleManager.modules["activities"];

module.exports = {
	/**
	 * Gets a set of activities
	 *
	 * @param session
	 * @param {String} userId - the user whose activities we are looking for
	 * @param {Integer} set - the set number to return
	 * @param cb
	 */
	getSet: (session, userId, set, cb) => {
		async.waterfall([
			next => {
				db.models.activity.find({ userId, hidden: false }).skip(15 * (set - 1)).limit(15).sort("createdAt").exec(next);
			},
		], async (err, activities) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("ACTIVITIES_GET_SET", `Failed to get set ${set} from activities. "${err}"`);
				return cb({ status: 'failure', message: err });
			}

			logger.success("ACTIVITIES_GET_SET", `Set ${set} from activities obtained successfully.`);
			cb({ status: "success", data: activities });
		});
	},

	/**
	 * Hides an activity for a user
	 * 
	 * @param session
	 * @param {String} activityId - the activity which should be hidden
	 * @param cb
	 */
	hideActivity: hooks.loginRequired((session, activityId, cb) => {
		async.waterfall([
			next => {
				db.models.activity.updateOne({ _id: activityId }, { $set: { hidden: true } }, next);
			}
		], async err => {
			if (err) {
				err = await utils.getError(err);
				logger.error("ACTIVITIES_HIDE_ACTIVITY", `Failed to hide activity ${activityId}. "${err}"`);
				return cb({ status: "failure", message: err });
			}
			
			logger.success("ACTIVITIES_HIDE_ACTIVITY", `Successfully hid activity ${activityId}.`);
			cb({ status: "success" })
		});
	})
};
