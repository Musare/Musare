import mongoose from "mongoose";
import async from "async";

import { isAdminRequired, isLoginRequired } from "./hooks";

// eslint-disable-next-line
import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const CacheModule = moduleManager.modules.cache;
const UtilsModule = moduleManager.modules.utils;
const YouTubeModule = moduleManager.modules.youtube;

export default {
	/**
	 * Returns details about the YouTube quota usage
	 *
	 * @returns {{status: string, data: object}}
	 */
	getQuotaStatus: isAdminRequired(function getQuotaStatus(session, fromDate, cb) {
		YouTubeModule.runJob("GET_QUOTA_STATUS", { fromDate }, this)
			.then(response => {
				this.log("SUCCESS", "YOUTUBE_GET_QUOTA_STATUS", `Getting quota status was successful.`);
				return cb({ status: "success", data: { status: response.status } });
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log("ERROR", "YOUTUBE_GET_QUOTA_STATUS", `Getting quota status failed. "${err}"`);
				return cb({ status: "error", message: err });
			});
	}),

	/**
	 * Returns YouTube quota chart data
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param timePeriod - either hours or days
	 * @param startDate - beginning date
	 * @param endDate - end date
	 * @param dataType - either usage or count
	 * @returns {{status: string, data: object}}
	 */
	getQuotaChartData: isAdminRequired(function getQuotaChartData(
		session,
		timePeriod,
		startDate,
		endDate,
		dataType,
		cb
	) {
		YouTubeModule.runJob(
			"GET_QUOTA_CHART_DATA",
			{ timePeriod, startDate: new Date(startDate), endDate: new Date(endDate), dataType },
			this
		)
			.then(data => {
				this.log("SUCCESS", "YOUTUBE_GET_QUOTA_CHART_DATA", `Getting quota chart data was successful.`);
				return cb({ status: "success", data });
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log("ERROR", "YOUTUBE_GET_QUOTA_CHART_DATA", `Getting quota chart data failed. "${err}"`);
				return cb({ status: "error", message: err });
			});
	}),

	/**
	 * Gets api requests, used in the admin youtube page by the AdvancedTable component
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param page - the page
	 * @param pageSize - the size per page
	 * @param properties - the properties to return for each news item
	 * @param sort - the sort object
	 * @param queries - the queries array
	 * @param operator - the operator for queries
	 * @param cb
	 */
	getApiRequests: isAdminRequired(async function getApiRequests(
		session,
		page,
		pageSize,
		properties,
		sort,
		queries,
		operator,
		cb
	) {
		async.waterfall(
			[
				next => {
					DBModule.runJob(
						"GET_DATA",
						{
							page,
							pageSize,
							properties,
							sort,
							queries,
							operator,
							modelName: "youtubeApiRequest",
							blacklistedProperties: [],
							specialProperties: {},
							specialQueries: {}
						},
						this
					)
						.then(response => {
							next(null, response);
						})
						.catch(err => {
							next(err);
						});
				}
			],
			async (err, response) => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "YOUTUBE_GET_API_REQUESTS", `Failed to get YouTube api requests. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "YOUTUBE_GET_API_REQUESTS", `Fetched YouTube api requests successfully.`);
				return cb({
					status: "success",
					message: "Successfully fetched YouTube api requests.",
					data: response
				});
			}
		);
	}),

	/**
	 * Returns a specific api request
	 *
	 * @returns {{status: string, data: object}}
	 */
	getApiRequest: isAdminRequired(function getApiRequest(session, apiRequestId, cb) {
		if (!mongoose.Types.ObjectId.isValid(apiRequestId))
			return cb({ status: "error", message: "Api request id is not a valid ObjectId." });

		return YouTubeModule.runJob("GET_API_REQUEST", { apiRequestId }, this)
			.then(response => {
				this.log(
					"SUCCESS",
					"YOUTUBE_GET_API_REQUEST",
					`Getting api request with id ${apiRequestId} was successful.`
				);
				return cb({ status: "success", data: { apiRequest: response.apiRequest } });
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log(
					"ERROR",
					"YOUTUBE_GET_API_REQUEST",
					`Getting api request with id ${apiRequestId} failed. "${err}"`
				);
				return cb({ status: "error", message: err });
			});
	}),

	/**
	 * Reset stored API requests
	 *
	 * @returns {{status: string, data: object}}
	 */
	resetStoredApiRequests: isAdminRequired(async function resetStoredApiRequests(session, cb) {
		YouTubeModule.runJob("RESET_STORED_API_REQUESTS", {}, this)
			.then(() => {
				this.log(
					"SUCCESS",
					"YOUTUBE_RESET_STORED_API_REQUESTS",
					`Resetting stored API requests was successful.`
				);
				return cb({ status: "success", message: "Successfully reset stored YouTube API requests" });
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log(
					"ERROR",
					"YOUTUBE_RESET_STORED_API_REQUESTS",
					`Resetting stored API requests failed. "${err}"`
				);
				return cb({ status: "error", message: err });
			});
	}),

	/**
	 * Remove stored API requests
	 *
	 * @returns {{status: string, data: object}}
	 */
	removeStoredApiRequest: isAdminRequired(function removeStoredApiRequest(session, requestId, cb) {
		YouTubeModule.runJob("REMOVE_STORED_API_REQUEST", { requestId }, this)
			.then(() => {
				this.log(
					"SUCCESS",
					"YOUTUBE_REMOVE_STORED_API_REQUEST",
					`Removing stored API request "${requestId}" was successful.`
				);

				return cb({ status: "success", message: "Successfully removed stored YouTube API request" });
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log(
					"ERROR",
					"YOUTUBE_REMOVE_STORED_API_REQUEST",
					`Removing stored API request "${requestId}" failed. "${err}"`
				);
				return cb({ status: "error", message: err });
			});
	}),

	/**
	 * Gets videos, used in the admin youtube page by the AdvancedTable component
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param page - the page
	 * @param pageSize - the size per page
	 * @param properties - the properties to return for each news item
	 * @param sort - the sort object
	 * @param queries - the queries array
	 * @param operator - the operator for queries
	 * @param cb
	 */
	getVideos: isAdminRequired(async function getVideos(
		session,
		page,
		pageSize,
		properties,
		sort,
		queries,
		operator,
		cb
	) {
		async.waterfall(
			[
				next => {
					DBModule.runJob(
						"GET_DATA",
						{
							page,
							pageSize,
							properties,
							sort,
							queries,
							operator,
							modelName: "youtubeVideo",
							blacklistedProperties: [],
							specialProperties: {},
							specialQueries: {}
						},
						this
					)
						.then(response => {
							next(null, response);
						})
						.catch(err => {
							next(err);
						});
				}
			],
			async (err, response) => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "YOUTUBE_GET_VIDEOS", `Failed to get YouTube videos. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "YOUTUBE_GET_VIDEOS", `Fetched YouTube videos successfully.`);
				return cb({
					status: "success",
					message: "Successfully fetched YouTube videos.",
					data: response
				});
			}
		);
	}),

	/**
	 * Get a YouTube video
	 *
	 * @returns {{status: string, data: object}}
	 */
	getVideo: isLoginRequired(function getVideo(session, identifier, createMissing, cb) {
		YouTubeModule.runJob("GET_VIDEO", { identifier, createMissing }, this)
			.then(res => {
				this.log("SUCCESS", "YOUTUBE_GET_VIDEO", `Fetching video was successful.`);

				return cb({ status: "success", message: "Successfully fetched YouTube video", data: res.video });
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log("ERROR", "YOUTUBE_GET_VIDEO", `Fetching video failed. "${err}"`);
				return cb({ status: "error", message: err });
			});
	}),

	/**
	 * Remove YouTube videos
	 *
	 * @returns {{status: string, data: object}}
	 */
	removeVideos: isAdminRequired(function removeVideos(session, videoIds, cb) {
		YouTubeModule.runJob("REMOVE_VIDEOS", { videoIds }, this)
			.then(() => {
				this.log("SUCCESS", "YOUTUBE_REMOVE_VIDEOS", `Removing videos was successful.`);

				return cb({ status: "success", message: "Successfully removed YouTube videos" });
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log("ERROR", "YOUTUBE_REMOVE_VIDEOS", `Removing videos failed. "${err}"`);
				return cb({ status: "error", message: err });
			});
	}),

	/**
	 * Requests a set of YouTube videos
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} url - the url of the the YouTube playlist
	 * @param {boolean} musicOnly - whether to only get music from the playlist
	 * @param {boolean} musicOnly - whether to return videos
	 * @param {Function} cb - gets called with the result
	 */
	requestSet: isLoginRequired(function requestSet(session, url, musicOnly, returnVideos, cb) {
		YouTubeModule.runJob("REQUEST_SET", { url, musicOnly, returnVideos }, this)
			.then(response => {
				this.log(
					"SUCCESS",
					"REQUEST_SET",
					`Successfully imported a YouTube playlist to be requested for user "${session.userId}".`
				);
				return cb({
					status: "success",
					message: `Playlist is done importing. ${response.successful} were added succesfully, ${response.failed} failed (${response.alreadyInDatabase} were already in database)`,
					videos: returnVideos ? response.videos : null
				});
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log(
					"ERROR",
					"REQUEST_SET",
					`Importing a YouTube playlist to be requested failed for user "${session.userId}". "${err}"`
				);
				return cb({ status: "error", message: err });
			});
	}),

	/**
	 * Requests a set of YouTube videos as an admin
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} url - the url of the the YouTube playlist
	 * @param {boolean} musicOnly - whether to only get music from the playlist
	 * @param {boolean} musicOnly - whether to return videos
	 * @param {Function} cb - gets called with the result
	 */
	requestSetAdmin: isAdminRequired(async function requestSetAdmin(session, url, musicOnly, returnVideos, cb) {
		this.keepLongJob();
		this.publishProgress({
			status: "started",
			title: "Import playlist",
			message: "Importing playlist.",
			id: this.toString()
		});
		await CacheModule.runJob("RPUSH", { key: `longJobs.requestSetAdmin`, value: this.toString() }, this);
		await CacheModule.runJob(
			"HSET",
			{
				table: `requestSetAdmin`,
				key: this.toString(),
				value: { payload: { url, musicOnly, returnVideos }, response: null }
			},
			this
		);

		YouTubeModule.runJob("REQUEST_SET", { url, musicOnly, returnVideos }, this)
			.then(async response => {
				this.log(
					"SUCCESS",
					"REQUEST_SET_ADMIN",
					`Successfully imported a YouTube playlist to be requested for admin "${session.userId}".`
				);
				this.publishProgress({
					status: "success",
					message: `Playlist is done importing. ${response.successful} were added succesfully, ${response.failed} failed (${response.alreadyInDatabase} were already in database)`
				});
				await CacheModule.runJob(
					"HSET",
					{
						table: `requestSetAdmin`,
						key: this.toString(),
						value: { payload: { url, musicOnly, returnVideos }, response }
					},
					this
				);
				return cb({
					status: "success",
					message: `Playlist is done importing. ${response.successful} were added succesfully, ${response.failed} failed (${response.alreadyInDatabase} were already in database)`,
					videos: returnVideos ? response.videos : null
				});
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log(
					"ERROR",
					"REQUEST_SET_ADMIN",
					`Importing a YouTube playlist to be requested failed for admin "${session.userId}". "${err}"`
				);
				this.publishProgress({
					status: "error",
					message: err
				});
				return cb({ status: "error", message: err });
			});
	}),

	/**
	 * Gets request set admin long jobs
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Function} cb - gets called with the result
	 */
	getRequestSetAdminLongJobs: isLoginRequired(async function getRequestSetAdminLongJobs(session, cb) {
		async.waterfall(
			[
				next => {
					CacheModule.runJob(
						"LRANGE",
						{
							key: `longJobs.requestSetAdmin`
						},
						this
					)
						.then(longJobUuids => next(null, longJobUuids))
						.catch(next);
				},

				(longJobUuids, next) => {
					next(
						null,
						longJobUuids.map(longJobUuid => ({
							job: moduleManager.jobManager.getJob(longJobUuid),
							uuid: longJobUuid
						}))
					);
				},

				(longJobs, next) => {
					async.eachLimit(
						longJobs,
						1,
						(longJob, next) => {
							CacheModule.runJob("HGET", { table: "requestSetAdmin", key: longJob.uuid }, this)
								.then(value => {
									if (value) {
										const { payload, response } = value;
										longJob.payload = payload;
										longJob.response = response;
									}
									next();
								})
								.catch(console.log);
						},
						err => {
							next(err, longJobs);
						}
					);
				},

				(longJobs, next) => {
					longJobs.forEach(({ job }) => {
						if (job && job.onProgress)
							job.onProgress.on("progress", data => {
								this.publishProgress(
									{
										id: job.toString(),
										...data
									},
									true
								);
							});
					});

					next(
						null,
						longJobs.map(({ job, uuid, payload, response }) => ({
							id: uuid,
							name: job ? job.longJobTitle : "",
							status: job ? job.lastProgressData.status : "",
							message: job ? job.lastProgressData.message : "",
							payload,
							response
						}))
					);
				}
			],
			async (err, longJobs) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"GET_REQUEST_SET_ADMIN_LONG_JOBS",
						`Couldn't get request set admin long jobs for user "${session.userId}". "${err}"`
					);

					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"GET_REQUEST_SET_ADMIN_LONG_JOBS",
					`Got request set admin  long jobs for user "${session.userId}".`
				);

				return cb({
					status: "success",
					data: {
						longJobs
					}
				});
			}
		);
	})
};
