import mongoose from "mongoose";
import async from "async";

import { isAdminRequired } from "./hooks";

// eslint-disable-next-line
import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const YouTubeModule = moduleManager.modules.youtube;
const WSModule = moduleManager.modules.ws;
const CacheModule = moduleManager.modules.cache;

CacheModule.runJob("SUB", {
	channel: "youtube.removeYoutubeApiRequest",
	cb: requestId => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `view-api-request.${requestId}`,
			args: ["event:youtubeApiRequest.removed"]
		});

		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.youtube",
			args: ["event:admin.youtubeApiRequest.removed", { data: { requestId } }]
		});
	}
});

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
	resetStoredApiRequests: isAdminRequired(function resetStoredApiRequests(session, cb) {
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

				CacheModule.runJob("PUB", {
					channel: "youtube.removeYoutubeApiRequest",
					value: requestId
				});

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
	})
};
