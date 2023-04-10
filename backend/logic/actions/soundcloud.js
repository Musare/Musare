import async from "async";

import isLoginRequired from "../hooks/loginRequired";
import { useHasPermission } from "../hooks/hasPermission";

// eslint-disable-next-line
import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const SoundcloudModule = moduleManager.modules.soundcloud;

export default {
	/**
	 * Fetches new SoundCloud API key
	 *
	 * @returns {{status: string, data: object}}
	 */
	fetchNewApiKey: useHasPermission("soundcloud.fetchNewApiKey", function fetchNewApiKey(session, cb) {
		SoundcloudModule.runJob("GENERATE_SOUNDCLOUD_API_KEY", {}, this)
			.then(response => {
				this.log("SUCCESS", "SOUNDCLOUD_FETCH_NEW_API_KEY", `Fetching new API key was successful.`);
				return cb({ status: "success", data: { status: response.status } });
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log("ERROR", "SOUNDCLOUD_FETCH_NEW_API_KEY", `Fetching new API key failed. "${err}"`);
				return cb({ status: "error", message: err });
			});
	}),

	/**
	 * Tests SoundCloud API key
	 *
	 * @returns {{status: string, data: object}}
	 */
	testApiKey: useHasPermission("soundcloud.testApiKey", function testApiKey(session, cb) {
		SoundcloudModule.runJob("TEST_SOUNDCLOUD_API_KEY", {}, this)
			.then(response => {
				this.log(
					"SUCCESS",
					"SOUNDCLOUD_TEST_API_KEY",
					`Testing API key was successful. Response: ${response}.`
				);
				return cb({ status: "success", data: { status: response.status } });
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log("ERROR", "SOUNDCLOUD_TEST_API_KEY", `Testing API key failed. "${err}"`);
				return cb({ status: "error", message: err });
			});
	}),

	/**
	 * Get a Soundcloud artist from ID
	 *
	 * @returns {{status: string, data: object}}
	 */
	getArtist: useHasPermission("soundcloud.getArtist", function getArtist(session, userPermalink, cb) {
		return SoundcloudModule.runJob("GET_ARTISTS_FROM_PERMALINKS", { userPermalinks: [userPermalink] }, this)
			.then(res => {
				if (res.artists.length === 0) {
					this.log("ERROR", "SOUNDCLOUD_GET_ARTISTS_FROM_PERMALINKS", `Fetching artist failed.`);
					return cb({ status: "error", message: "Failed to get artist" });
				}

				this.log("SUCCESS", "SOUNDCLOUD_GET_ARTISTS_FROM_PERMALINKS", `Fetching artist was successful.`);
				return cb({
					status: "success",
					message: "Successfully fetched Soundcloud artist",
					data: res.artists[0]
				});
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log("ERROR", "SOUNDCLOUD_GET_ARTISTS_FROM_PERMALINKS", `Fetching artist failed. "${err}"`);
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
	getTracks: useHasPermission(
		"admin.view.soundcloudTracks",
		async function getTracks(session, page, pageSize, properties, sort, queries, operator, cb) {
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
								modelName: "soundcloudTrack",
								blacklistedProperties: [],
								specialProperties: {
									songId: [
										// Fetch songs from songs collection with a matching mediaSource
										{
											$lookup: {
												from: "songs", // TODO fix this to support mediasource, so start with youtube:, so add a new pipeline steps
												localField: "trackId",
												foreignField: "trackId",
												as: "song"
											}
										},
										// Turn the array of songs returned in the last step into one object, since only one song should have been returned maximum
										{
											$unwind: {
												path: "$song",
												preserveNullAndEmptyArrays: true
											}
										},
										// Add new field songId, which grabs the song object's _id and tries turning it into a string
										{
											$addFields: {
												songId: {
													$convert: {
														input: "$song._id",
														to: "string",
														onError: "",
														onNull: ""
													}
												}
											}
										},
										// Cleanup, don't return the song object for any further steps
										{
											$project: {
												song: 0
											}
										}
									]
								},
								specialQueries: {},
								specialFilters: {
									// importJob: importJobId => [
									// 	{
									// 		$lookup: {
									// 			from: "importjobs",
									// 			let: { trackId: "$trackId" },
									// 			pipeline: [
									// 				{
									// 					$match: {
									// 						_id: mongoose.Types.ObjectId(importJobId)
									// 					}
									// 				},
									// 				{
									// 					$addFields: {
									// 						importJob: {
									// 							$in: ["$$trackId", "$response.successfulVideoIds"]
									// 						}
									// 					}
									// 				},
									// 				{
									// 					$project: {
									// 						importJob: 1,
									// 						_id: 0
									// 					}
									// 				}
									// 			],
									// 			as: "importJob"
									// 		}
									// 	},
									// 	{
									// 		$unwind: "$importJob"
									// 	},
									// 	{
									// 		$set: {
									// 			importJob: "$importJob.importJob"
									// 		}
									// 	}
									// ]
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
						this.log("ERROR", "SOUNDCLOUD_GET_VIDEOS", `Failed to get SoundCloud tracks. "${err}"`);
						return cb({ status: "error", message: err });
					}
					this.log("SUCCESS", "SOUNDCLOUD_GET_VIDEOS", `Fetched SoundCloud tracks successfully.`);
					return cb({
						status: "success",
						message: "Successfully fetched SoundCloud tracks.",
						data: response
					});
				}
			);
		}
	),

	/**
	 * Get a SoundCloud track
	 *
	 * @returns {{status: string, data: object}}
	 */
	getTrack: isLoginRequired(function getTrack(session, identifier, createMissing, cb) {
		return SoundcloudModule.runJob("GET_TRACK", { identifier, createMissing }, this)
			.then(res => {
				this.log("SUCCESS", "SOUNDCLOUD_GET_VIDEO", `Fetching track was successful.`);

				return cb({ status: "success", message: "Successfully fetched SoundCloud video", data: res.track });
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log("ERROR", "SOUNDCLOUD_GET_VIDEO", `Fetching track failed. "${err}"`);
				return cb({ status: "error", message: err });
			});
	})
};
