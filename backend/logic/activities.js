import async from "async";

import CoreClass from "../core";

let ActivitiesModule;
let DBModule;
let CacheModule;
let UtilsModule;
let IOModule;

class _ActivitiesModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("activities");

		ActivitiesModule = this;
	}

	/**
	 * Initialises the activities module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	initialize() {
		return new Promise(resolve => {
			DBModule = this.moduleManager.modules.db;
			CacheModule = this.moduleManager.modules.cache;
			UtilsModule = this.moduleManager.modules.utils;
			IOModule = this.moduleManager.modules.io;

			resolve();
		});
	}

	// TODO: Migrate
	/**
	 * Adds a new activity to the database
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.userId - the id of the user who's activity is to be added
	 * @param {string} payload.type - the type of activity (enum specified in schema)
	 * @param {object} payload.payload - the details of the activity e.g. an array of songs that were added
	 * @param {string} payload.payload.message - the main message describing the activity e.g. 50 songs added to playlist 'playlist name'
	 * @param {string} payload.payload.thumbnail - url to a thumbnail e.g. song album art to be used when display an activity
	 * @param {string} payload.payload.songId - (optional) if relevant, the id of the song related to the activity
	 * @param {string} payload.payload.playlistId - (optional) if relevant, the id of the playlist related to the activity
	 * @param {string} payload.payload.stationId - (optional) if relevant, the id of the station related to the activity
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
						const { userId, type } = payload;

						const activity = new ActivityModel({
							userId,
							type,
							payload: payload.payload
						});

						activity.save(next);
					},

					(activity, next) => {
						IOModule.runJob("SOCKETS_FROM_USER", { userId: activity.userId }, this)
							.then(res => {
								res.sockets.forEach(socket => socket.emit("event:activity.create", activity));
								next(null, activity);
							})
							.catch(next);
					},

					(activity, next) => {
						IOModule.runJob("EMIT_TO_ROOM", {
							room: `profile-${activity.userId}-activities`,
							args: ["event:activity.create", activity]
						});

						return next(null, activity);
					},

					(activity, next) => {
						const activitiesToCheckFor = [
							"user__toggle_nightmode",
							"user__toggle_autoskip_disliked_songs",
							"song__like",
							"song__unlike",
							"song__dislike",
							"song__undislike"
						];

						CacheModule.runJob("HGET", { table: "recentActivities", key: activity.userId })
							.then(recentActivity => {
								if (recentActivity) {
									const FifteenMinsTimeDifference =
										new Date() - new Date(recentActivity.createdAt) < 15 * 60 * 1000;

									// check if most recent and the new activity have the same type, if it was in the last 15 mins,
									// and if it is within the activitiesToCheckFor array
									if (
										recentActivity.type === activity.type &&
										!!FifteenMinsTimeDifference &&
										activitiesToCheckFor.includes(activity.type)
									)
										return ActivitiesModule.runJob(
											"CHECK_FOR_ACTIVITY_SPAM",
											{ userId: activity.userId, type: activity.type },
											this
										)
											.then(() => next(null, activity))
											.catch(next);

									return next(null, activity);
								}

								return next(null, activity);
							})
							.catch(next);
					},

					// store most recent activity in cache to be quickly accessible
					(activity, next) =>
						CacheModule.runJob(
							"HSET",
							{
								table: "recentActivities",
								key: activity.userId,
								value: { createdAt: activity.createdAt, type: activity.type }
							},
							this
						)
							.then(() => next(null))
							.catch(next)
				],
				async (err, activity) => {
					if (err) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						return reject(new Error(err));
					}

					return resolve(activity);
				}
			);
		});
	}

	/**
	 * Removes any activities of the same type within a 15-minute period to prevent spam
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.userId - the id of the user to check for duplicates
	 * @param {string} payload.type - the type of activity to check for duplicates
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async CHECK_FOR_ACTIVITY_SPAM(payload) {
		const activityModel = await DBModule.runJob("GET_MODEL", { modelName: "activity" }, this);

		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					// find all activities of this type from the last 15 minutes
					next => {
						activityModel
							.find(
								{
									userId: payload.userId,
									type: payload.type,
									hidden: false,
									createdAt: {
										$gte: new Date(new Date() - 15 * 60 * 1000)
									}
								},
								"_id"
							)
							.sort({ createdAt: -1 })
							.skip(1)
							.exec(next);
					},

					// hide these activities and emit to socket listeners
					(activities, next) => {
						activities.forEach(activity => {
							activityModel.updateOne({ _id: activity._id }, { $set: { hidden: true } }).catch(next);

							IOModule.runJob("SOCKETS_FROM_USER", { userId: payload.userId }, this)
								.then(res =>
									res.sockets.forEach(socket => socket.emit("event:activity.hide", activity._id))
								)
								.catch(next);

							IOModule.runJob("EMIT_TO_ROOM", {
								room: `profile-${payload.userId}-activities`,
								args: ["event:activity.hide", activity._id]
							});
						});

						return next();
					}
				],
				async err => {
					if (err) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						return reject(new Error(err));
					}

					return resolve();
				}
			);
		});
	}
}

export default new _ActivitiesModule();
