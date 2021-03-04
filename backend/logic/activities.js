import async from "async";

import CoreClass from "../core";

let ActivitiesModule;
let DBModule;
let CacheModule;
let UtilsModule;
let IOModule;
let PlaylistsModule;

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
			PlaylistsModule = this.moduleManager.modules.playlists;

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
							.then(sockets => {
								sockets.forEach(socket => socket.dispatch("event:activity.create", activity));
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
						const mergeableActivities = ["playlist__remove_song", "playlist__add_song"];

						const spammableActivities = [
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
									const timeDifference = mins =>
										new Date() - new Date(recentActivity.createdAt) < mins * 60 * 1000;

									// if both activities have the same type, if within last 15 mins and if activity is within the spammableActivities array
									if (
										recentActivity.type === activity.type &&
										!!timeDifference(15) &&
										spammableActivities.includes(activity.type)
									)
										return ActivitiesModule.runJob(
											"CHECK_FOR_ACTIVITY_SPAM_TO_HIDE",
											{ userId: activity.userId, type: activity.type },
											this
										)
											.then(() => next(null, activity))
											.catch(next);

									// if activity is within the mergeableActivities array, if both activities are about removing/adding and if within last 5 mins
									if (
										mergeableActivities.includes(activity.type) &&
										recentActivity.type === activity.type &&
										!!timeDifference(5)
									) {
										return PlaylistsModule.runJob("GET_PLAYLIST", {
											playlistId: activity.payload.playlistId
										})
											.then(playlist =>
												ActivitiesModule.runJob(
													"CHECK_FOR_ACTIVITY_SPAM_TO_MERGE",
													{
														userId: activity.userId,
														type: activity.type,
														playlist: {
															playlistId: playlist._id,
															displayName: playlist.displayName
														}
													},
													this
												)
													.then(() => next(null, activity))
													.catch(next)
											)
											.catch(next);
									}
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
	 * Merges activities about adding/removing songs from a playlist within a 5-minute period to prevent spam
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.userId - the id of the user to check for duplicates
	 * @param {object} payload.playlist - object that contains info about the relevant playlist
	 * @param {string} payload.playlist.playlistId - the id of the playlist
	 * @param {string} payload.playlist.displayName - the display name of the playlist
	 * @param {string} payload.type - the type of activity to check for duplicates
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async CHECK_FOR_ACTIVITY_SPAM_TO_MERGE(payload) {
		const activityModel = await DBModule.runJob("GET_MODEL", { modelName: "activity" }, this);

		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					// find all activities of this type from the last 5 minutes
					next => {
						activityModel
							.find(
								{
									userId: payload.userId,
									type: { $in: [payload.type, `${payload.type}s`] },
									hidden: false,
									createdAt: {
										$gte: new Date(new Date() - 5 * 60 * 1000)
									},
									"payload.playlistId": payload.playlist.playlistId
								},
								["_id", "type", "payload.message"]
							)
							.sort({ createdAt: -1 })
							.exec(next);
					},

					// hide these activities, emit to socket listeners and count number of songs in each
					(activities, next) => {
						let howManySongs = 0; // how many songs added/removed

						activities.forEach(activity => {
							activityModel.updateOne({ _id: activity._id }, { $set: { hidden: true } }).catch(next);

							IOModule.runJob("SOCKETS_FROM_USER", { userId: payload.userId }, this)
								.then(sockets =>
									sockets.forEach(socket => socket.dispatch("event:activity.hide", activity._id))
								)
								.catch(next);

							IOModule.runJob("EMIT_TO_ROOM", {
								room: `profile-${payload.userId}-activities`,
								args: ["event:activity.hide", activity._id]
							});

							if (activity.type === payload.type) howManySongs += 1;
							else if (activity.type === `${payload.type}s`)
								howManySongs += parseInt(
									activity.payload.message.replace(
										/(?:Removed|Added)\s(?<songs>\d+)\ssongs.+/g,
										"$<songs>"
									)
								);
						});

						return next(null, howManySongs);
					},

					// // delete in cache the most recent activity to avoid issues when adding a new activity
					(howManySongs, next) => {
						CacheModule.runJob("HDEL", { table: "recentActivities", key: payload.userId }, this)
							.then(() => next(null, howManySongs))
							.catch(next);
					},

					// add a new activity that merges the activities together
					(howManySongs, next) => {
						const activity = {
							userId: payload.userId,
							type: "",
							payload: {
								message: "",
								playlistId: payload.playlist.playlistId
							}
						};

						if (payload.type === "playlist__remove_song" || payload.type === "playlist__remove_songs") {
							activity.payload.message = `Removed ${howManySongs} songs from playlist <playlistId>${payload.playlist.displayName}</playlistId>`;
							activity.type = "playlist__remove_songs";
						} else if (payload.type === "playlist__add_song" || payload.type === "playlist__add_songs") {
							activity.payload.message = `Added ${howManySongs} songs to playlist <playlistId>${payload.playlist.displayName}</playlistId>`;
							activity.type = "playlist__add_songs";
						}

						ActivitiesModule.runJob("ADD_ACTIVITY", activity, this)
							.then(() => next())
							.catch(next);
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

	/**
	 * Hides any activities of the same type within a 15-minute period to prevent spam
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.userId - the id of the user to check for duplicates
	 * @param {string} payload.type - the type of activity to check for duplicates
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async CHECK_FOR_ACTIVITY_SPAM_TO_HIDE(payload) {
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
								.then(sockets =>
									sockets.forEach(socket => socket.dispatch("event:activity.hide", activity._id))
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
