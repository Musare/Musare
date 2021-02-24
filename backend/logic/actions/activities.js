import async from "async";

import { isLoginRequired } from "./hooks";

import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const CacheModule = moduleManager.modules.cache;
const IOModule = moduleManager.modules.io;
const UtilsModule = moduleManager.modules.utils;

CacheModule.runJob("SUB", {
	channel: "activity.removeAllForUser",
	cb: userId => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId }, this).then(res =>
			res.sockets.forEach(socket => socket.emit("event:activity.removeAllForUser"))
		);

		IOModule.runJob("EMIT_TO_ROOM", {
			room: `profile-${userId}-activities`,
			args: ["event:activity.removeAllForUser"]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "activity.hide",
	cb: res => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(response =>
			response.sockets.forEach(socket => socket.emit("event:activity.hide", res.activityId))
		);

		IOModule.runJob("EMIT_TO_ROOM", {
			room: `profile-${res.userId}-activities`,
			args: ["event:activity.hide", res.activityId]
		});
	}
});

export default {
	/**
	 * Gets a set of activities
	 *
	 * @param {object} session - user session
	 * @param {string} userId - the user whose activities we are looking for
	 * @param {number} set - the set number to return
	 * @param {Function} cb - callback
	 */
	async getSet(session, userId, set, cb) {
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
						.skip(15 * (set - 1))
						.limit(15)
						.sort({ createdAt: -1 })
						.exec(next);
				}
			],
			async (err, activities) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "ACTIVITIES_GET_SET", `Failed to get set ${set} from activities. "${err}"`);
					return cb({ status: "failure", message: err });
				}

				this.log("SUCCESS", "ACTIVITIES_GET_SET", `Set ${set} from activities obtained successfully.`);
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
					return cb({ status: "failure", message: err });
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

					return cb({ status: "failure", message: err });
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
