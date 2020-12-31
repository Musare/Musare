import async from "async";

import CoreClass from "../core";

// let ActivitiesModule;
let DBModule;
let UtilsModule;

class _ActivitiesModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("activities");

		// ActivitiesModule = this;
	}

	/**
	 * Initialises the activities module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	initialize() {
		return new Promise(resolve => {
			DBModule = this.moduleManager.modules.db;
			UtilsModule = this.moduleManager.modules.utils;

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
						DBModule.runJob("GET_MODEL", { modelName: "activity" }, this)
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
						UtilsModule.runJob(
							"SOCKETS_FROM_USER",
							{
								userId: activity.userId
							},
							this
						)
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
						err = await UtilsModule.runJob(
							"GET_ERROR",
							{
								error: err
							},
							this
						);
						reject(new Error(err));
					} else {
						resolve({ activity });
					}
				}
			);
		});
	}
}

export default new _ActivitiesModule();
