import async from "async";

import { isLoginRequired } from "./hooks";

// eslint-disable-next-line
import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const CacheModule = moduleManager.modules.cache;
const WSModule = moduleManager.modules.ws;
const UtilsModule = moduleManager.modules.utils;

CacheModule.runJob("SUB", {
	channel: "activity.removeAllForUser",
	cb: userId => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId }, this).then(sockets =>
			sockets.forEach(socket => socket.dispatch("event:activity.removeAllForUser"))
		);
	}
});

CacheModule.runJob("SUB", {
	channel: "activity.hide",
	cb: res => {
		const { activityId, userId } = res;

		WSModule.runJob("SOCKETS_FROM_USER", { userId }, this).then(sockets =>
			sockets.forEach(socket => socket.dispatch("event:activity.hidden", { data: { activityId } }))
		);
	}
});

export default {
	/**
	 * Returns how many activities there are for a user
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} userId - the id of the user in question
	 * @param {Function} cb - callback
	 */
	async length(session, userId, cb) {
		const activityModel = await DBModule.runJob("GET_MODEL", { modelName: "activity" }, this);

		async.waterfall(
			[
				next => {
					activityModel.countDocuments({ userId, hidden: false }, next);
				}
			],
			async (err, count) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"SONGS_LENGTH",
						`Failed to get length of activities for user ${userId}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "ACTIVITIES_LENGTH", `Got length of activities for user ${userId} successfully.`);

				return cb({
					status: "success",
					message: "Successfully obtained length of activities.",
					data: { length: count }
				});
			}
		);
	},

	/**
	 * Gets a set of activities
	 *
	 * @param {object} session - user session
	 * @param {string} userId - the user whose activities we are looking for
	 * @param {number} set - the set number to return
	 * @param {number} offset - how many activities to skip (keeps frontend and backend in sync)
	 * @param {Function} cb - callback
	 */
	async getSet(session, userId, set, offset, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		const activityModel = await DBModule.runJob("GET_MODEL", { modelName: "activity" }, this);

		async.waterfall(
			[
				next => {
					// activities should only be viewed if public/owned by the user
					if (session.userId !== userId) {
						return userModel
							.findById(userId)
							.then(user => {
								if (user) {
									if (user.preferences.activityLogPublic) return next();
									return next("User's activity log isn't public.");
								}

								return next("User does not exist.");
							})
							.catch(next);
					}

					return next();
				},

				next => {
					activityModel
						.find({ userId, hidden: false })
						.skip(15 * (set - 1) + offset)
						.limit(15)
						.sort({ createdAt: -1 })
						.exec(next);
				}
			],
			async (err, activities) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "ACTIVITIES_GET_SET", `Failed to get set ${set} from activities. "${err}"`);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "ACTIVITIES_GET_SET", `Set ${set} from activities obtained successfully.`);
				return cb({ status: "success", data: { activities } });
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
	hideActivity: isLoginRequired(async function hideActivity(session, activityId, cb) {
		const activityModel = await DBModule.runJob("GET_MODEL", { modelName: "activity" }, this);

		async.waterfall(
			[
				next => {
					activityModel.updateOne({ _id: activityId }, { $set: { hidden: true } }, next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "ACTIVITIES_HIDE_ACTIVITY", `Failed to hide activity ${activityId}. "${err}"`);
					return cb({ status: "error", message: err });
				}

				CacheModule.runJob("PUB", {
					channel: "activity.hide",
					value: {
						userId: session.userId,
						activityId
					}
				});

				this.log("SUCCESS", "ACTIVITIES_HIDE_ACTIVITY", `Successfully hid activity ${activityId}.`);

				return cb({ status: "success", message: "Successfully hid activity." });
			}
		);
	}),

	/**
	 * Removes all activities logged for a logged-in user
	 *
	 * @param session
	 * @param cb
	 */
	removeAllForUser: isLoginRequired(async function removeAllForUser(session, cb) {
		const activityModel = await DBModule.runJob("GET_MODEL", { modelName: "activity" }, this);

		async.waterfall(
			[
				next => {
					activityModel.deleteMany({ userId: session.userId }, next);
				},

				(res, next) => {
					CacheModule.runJob("HDEL", { table: "recentActivities", key: session.userId }, this)
						.then(() => next())
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"ACTIVITIES_REMOVE_ALL_FOR_USER",
						`Failed to delete activities for user ${session.userId}. "${err}"`
					);

					return cb({ status: "error", message: err });
				}

				CacheModule.runJob("PUB", {
					channel: "activity.removeAllForUser",
					value: session.userId
				});

				this.log(
					"SUCCESS",
					"ACTIVITIES_REMOVE_ALL_FOR_USER",
					`Successfully removed activities for user ${session.userId}.`
				);

				return cb({ status: "success", message: "Successfully removed your activity logs." });
			}
		);
	})
};
