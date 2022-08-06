import mongoose from "mongoose";
import async from "async";

import isLoginRequired from "../hooks/loginRequired";
import { useHasPermission } from "../hooks/hasPermission";

// eslint-disable-next-line
import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const CacheModule = moduleManager.modules.cache;
const UtilsModule = moduleManager.modules.utils;
const YouTubeModule = moduleManager.modules.youtube;
const MediaModule = moduleManager.modules.media;

export default {
	/**
	 * Returns details about the YouTube quota usage
	 *
	 * @returns {{status: string, data: object}}
	 */
	getQuotaStatus: useHasPermission("admin.view.youtube", function getQuotaStatus(session, fromDate, cb) {
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
	getQuotaChartData: useHasPermission(
		"admin.view.youtube",
		function getQuotaChartData(session, timePeriod, startDate, endDate, dataType, cb) {
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
		}
	),

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
	getApiRequests: useHasPermission(
		"admin.view.youtube",
		async function getApiRequests(session, page, pageSize, properties, sort, queries, operator, cb) {
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
		}
	),

	/**
	 * Returns a specific api request
	 *
	 * @returns {{status: string, data: object}}
	 */
	getApiRequest: useHasPermission("youtube.getApiRequest", function getApiRequest(session, apiRequestId, cb) {
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
	resetStoredApiRequests: useHasPermission(
		"youtube.resetStoredApiRequests",
		async function resetStoredApiRequests(session, cb) {
			this.keepLongJob();
			this.publishProgress({
				status: "started",
				title: "Reset stored API requests",
				message: "Resetting stored API requests.",
				id: this.toString()
			});
			await CacheModule.runJob("RPUSH", { key: `longJobs.${session.userId}`, value: this.toString() }, this);
			await CacheModule.runJob(
				"PUB",
				{
					channel: "longJob.added",
					value: { jobId: this.toString(), userId: session.userId }
				},
				this
			);

			YouTubeModule.runJob("RESET_STORED_API_REQUESTS", {}, this)
				.then(() => {
					this.log(
						"SUCCESS",
						"YOUTUBE_RESET_STORED_API_REQUESTS",
						`Resetting stored API requests was successful.`
					);
					this.publishProgress({
						status: "success",
						message: "Successfully reset stored YouTube API requests."
					});
					return cb({ status: "success", message: "Successfully reset stored YouTube API requests" });
				})
				.catch(async err => {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"YOUTUBE_RESET_STORED_API_REQUESTS",
						`Resetting stored API requests failed. "${err}"`
					);
					this.publishProgress({
						status: "error",
						message: err
					});
					return cb({ status: "error", message: err });
				});
		}
	),

	/**
	 * Remove stored API requests
	 *
	 * @returns {{status: string, data: object}}
	 */
	removeStoredApiRequest: useHasPermission(
		"youtube.removeStoredApiRequest",
		function removeStoredApiRequest(session, requestId, cb) {
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
		}
	),

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
	getVideos: useHasPermission(
		"admin.view.youtubeVideos",
		async function getVideos(session, page, pageSize, properties, sort, queries, operator, cb) {
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
								specialQueries: {},
								specialFilters: {
									importJob: importJobId => [
										{
											$lookup: {
												from: "importjobs",
												let: { youtubeId: "$youtubeId" },
												pipeline: [
													{
														$match: {
															_id: mongoose.Types.ObjectId(importJobId)
														}
													},
													{
														$addFields: {
															importJob: {
																$in: ["$$youtubeId", "$response.successfulVideoIds"]
															}
														}
													},
													{
														$project: {
															importJob: 1,
															_id: 0
														}
													}
												],
												as: "importJob"
											}
										},
										{
											$unwind: "$importJob"
										},
										{
											$set: {
												importJob: "$importJob.importJob"
											}
										}
									]
								}
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
		}
	),

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
	removeVideos: useHasPermission("youtube.removeVideos", async function removeVideos(session, videoIds, cb) {
		this.keepLongJob();
		this.publishProgress({
			status: "started",
			title: "Bulk remove YouTube videos",
			message: "Bulk removing YouTube videos.",
			id: this.toString()
		});
		await CacheModule.runJob("RPUSH", { key: `longJobs.${session.userId}`, value: this.toString() }, this);
		await CacheModule.runJob(
			"PUB",
			{
				channel: "longJob.added",
				value: { jobId: this.toString(), userId: session.userId }
			},
			this
		);

		YouTubeModule.runJob("REMOVE_VIDEOS", { videoIds }, this)
			.then(() => {
				this.log("SUCCESS", "YOUTUBE_REMOVE_VIDEOS", `Removing videos was successful.`);
				this.publishProgress({
					status: "success",
					message: "Successfully removed YouTube videos."
				});
				return cb({ status: "success", message: "Successfully removed YouTube videos" });
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log("ERROR", "YOUTUBE_REMOVE_VIDEOS", `Removing videos failed. "${err}"`);
				this.publishProgress({
					status: "error",
					message: err
				});
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
	requestSetAdmin: useHasPermission(
		"youtube.requestSetAdmin",
		async function requestSetAdmin(session, url, musicOnly, returnVideos, cb) {
			const importJobModel = await DBModule.runJob("GET_MODEL", { modelName: "importJob" }, this);

			this.keepLongJob();
			this.publishProgress({
				status: "started",
				title: "Import playlist",
				message: "Importing playlist.",
				id: this.toString()
			});
			await CacheModule.runJob("RPUSH", { key: `longJobs.${session.userId}`, value: this.toString() }, this);
			await CacheModule.runJob(
				"PUB",
				{
					channel: "longJob.added",
					value: { jobId: this.toString(), userId: session.userId }
				},
				this
			);

			async.waterfall(
				[
					next => {
						importJobModel.create(
							{
								type: "youtube",
								query: {
									url,
									musicOnly
								},
								status: "in-progress",
								response: {},
								requestedBy: session.userId,
								requestedAt: Date.now()
							},
							next
						);
					},

					(importJob, next) => {
						YouTubeModule.runJob("REQUEST_SET", { url, musicOnly, returnVideos }, this)
							.then(response => {
								next(null, importJob, response);
							})
							.catch(err => {
								next(err, importJob);
							});
					},

					(importJob, response, next) => {
						importJobModel.updateOne(
							{ _id: importJob._id },
							{
								$set: {
									status: "success",
									response: {
										failed: response.failed,
										successful: response.successful,
										alreadyInDatabase: response.alreadyInDatabase,
										successfulVideoIds: response.successfulVideoIds,
										failedVideoIds: response.failedVideoIds
									}
								}
							},
							err => {
								if (err) next(err, importJob);
								else
									MediaModule.runJob("UPDATE_IMPORT_JOBS", { jobIds: importJob._id })
										.then(() => next(null, importJob, response))
										.catch(error => next(error, importJob));
							}
						);
					}
				],
				async (err, importJob, response) => {
					if (err) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						this.log(
							"ERROR",
							"REQUEST_SET_ADMIN",
							`Importing a YouTube playlist to be requested failed for admin "${session.userId}". "${err}"`
						);
						importJobModel.updateOne({ _id: importJob._id }, { $set: { status: "error" } });
						MediaModule.runJob("UPDATE_IMPORT_JOBS", { jobIds: importJob._id });
						return cb({ status: "error", message: err });
					}

					this.log(
						"SUCCESS",
						"REQUEST_SET_ADMIN",
						`Successfully imported a YouTube playlist to be requested for admin "${session.userId}".`
					);

					this.publishProgress({
						status: "success",
						message: `Playlist is done importing. ${response.successful} were added succesfully, ${response.failed} failed (${response.alreadyInDatabase} were already in database)`
					});

					return cb({
						status: "success",
						message: `Playlist is done importing. ${response.successful} were added succesfully, ${response.failed} failed (${response.alreadyInDatabase} were already in database)`,
						videos: returnVideos ? response.videos : null
					});
				}
			);
		}
	)
};
