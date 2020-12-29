import async from "async";

import CoreClass from "../core";

class ActivitiesModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("activities");
	}

	/**
	 * Initialises the activities module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	initialize() {
		return new Promise(resolve => {
			this.db = this.moduleManager.modules.db;
			this.io = this.moduleManager.modules.io;
			this.utils = this.moduleManager.modules.utils;

			resolve();
		});
	}

	// TODO: Migrate
	/**
	 * Adds a new activity to the database
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.userId - the id of the user who's activity is to be added
	 * @param {string} payload.activityType - the type of activity (enum specified in schema)
	 * @param {Array} payload.payload - the details of the activity e.g. an array of songs that were added
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	ADD_ACTIVITY(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						this.db
							.runJob("GET_MODEL", { modelName: "activity" })
							.then(res => next(null, res))
							.catch(next);
					},
					(ActivityModel, next) => {
						const activity = new ActivityModel({
							userId: payload.userId,
							activityType: payload.activityType,
							payload: payload.payload
						});

						activity.save((err, activity) => {
							if (err) return next(err);
							return next(null, activity);
						});
					},

					(activity, next) => {
						this.utils
							.runJob("SOCKETS_FROM_USER", {
								userId: activity.userId
							})
							.then(response => {
								response.sockets.forEach(socket => {
									socket.emit("event:activity.create", activity);
								});
								next();
							})
							.catch(next);
					}
				],
				async (err, activity) => {
					if (err) {
						err = await this.utils.runJob("GET_ERROR", {
							error: err
						});
						reject(new Error(err));
					} else {
						resolve({ activity });
					}
				}
			);
		});
	}
}

export default new ActivitiesModule();
