import async from "async";

import CoreClass from "../core";

// let ActivitiesModule;
let DBModule;
let UtilsModule;
let IOModule;

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
					}
				],
				async (err, activity) => {
					if (err) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						reject(new Error(err));
					} else {
						resolve(activity);
					}
				}
			);
		});
	}
}

export default new _ActivitiesModule();
