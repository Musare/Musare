import config from "config";
import async from "async";
import axios from "axios";

import isLoginRequired from "../hooks/loginRequired";
import { hasPermission, useHasPermission } from "../hooks/hasPermission";

// eslint-disable-next-line
import moduleManager from "../../index";

const UtilsModule = moduleManager.modules.utils;
const WSModule = moduleManager.modules.ws;
const YouTubeModule = moduleManager.modules.youtube;
const SpotifyModule = moduleManager.modules.spotify;
const CacheModule = moduleManager.modules.cache;

export default {
	/**
	 * Fetches a list of songs from Youtube's API
	 *
	 * @param {object} session - user session
	 * @param {string} query - the query we'll pass to youtubes api
	 * @param {Function} cb - callback
	 * @returns {{status: string, data: object}} - returns an object
	 */
	searchYoutube: isLoginRequired(function searchYoutube(session, query, cb) {
		return YouTubeModule.runJob("SEARCH", { query }, this)
			.then(data => {
				this.log("SUCCESS", "APIS_SEARCH_YOUTUBE", `Searching YouTube successful with query "${query}".`);
				return cb({ status: "success", data });
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log("ERROR", "APIS_SEARCH_YOUTUBE", `Searching youtube failed with query "${query}". "${err}"`);
				return cb({ status: "error", message: err });
			});
	}),

	/**
	 * Fetches a specific page of search results from Youtube's API
	 *
	 * @param {object} session - user session
	 * @param {string} query - the query we'll pass to youtubes api
	 * @param {string} pageToken - identifies a specific page in the result set that should be retrieved
	 * @param {Function} cb - callback
	 * @returns {{status: string, data: object}} - returns an object
	 */
	searchYoutubeForPage: isLoginRequired(function searchYoutubeForPage(session, query, pageToken, cb) {
		return YouTubeModule.runJob("SEARCH", { query, pageToken }, this)
			.then(data => {
				this.log(
					"SUCCESS",
					"APIS_SEARCH_YOUTUBE_FOR_PAGE",
					`Searching YouTube successful with query "${query}".`
				);
				return cb({ status: "success", data });
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log(
					"ERROR",
					"APIS_SEARCH_YOUTUBE_FOR_PAGE",
					`Searching youtube failed with query "${query}". "${err}"`
				);
				return cb({ status: "error", message: err });
			});
	}),

	/**
	 * Gets Discogs data
	 *
	 * @param session
	 * @param query - the query
	 * @param {Function} cb
	 */
	searchDiscogs: useHasPermission("apis.searchDiscogs", function searchDiscogs(session, query, page, cb) {
		async.waterfall(
			[
				next => {
					const options = {
						params: { q: query, per_page: 20, page },
						headers: {
							"User-Agent": "Request",
							Authorization: `Discogs key=${config.get("apis.discogs.client")}, secret=${config.get(
								"apis.discogs.secret"
							)}`
						}
					};

					axios
						.get("https://api.discogs.com/database/search", options)
						.then(res => next(null, res.data))
						.catch(err => next(err));
				}
			],
			async (err, body) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"APIS_SEARCH_DISCOGS",
						`Searching discogs failed with query "${query}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}
				this.log(
					"SUCCESS",
					"APIS_SEARCH_DISCOGS",
					`User "${session.userId}" searched Discogs succesfully for query "${query}".`
				);
				return cb({
					status: "success",
					data: {
						results: body.results,
						pages: body.pagination.pages
					}
				});
			}
		);
	}),

	// /**
	//  *
	//  *
	//  * @param session
	//  * @param ISRC - the ISRC
	//  * @param {Function} cb
	//  */
	// searchMusicBrainzISRC: useHasPermission("admin.view.spotify", function searchMusicBrainzISRC(session, ISRC, cb) {
	// 	async.waterfall(
	// 		[
	// 			next => {
	// 				if (!ISRC) {
	// 					next("Invalid ISRC provided.");
	// 					return;
	// 				}

	// 				CacheModule.runJob("HGET", { table: "musicbrainz-isrc-2", key: ISRC })
	// 					.then(response => {
	// 						if (response) next(null, response);
	// 						else next(null, null);
	// 					})
	// 					.catch(err => {
	// 						next(err);
	// 					});
	// 			},

	// 			(body, next) => {
	// 				if (body) {
	// 					next(null, body);
	// 					return;
	// 				}

	// 				const options = {
	// 					params: { fmt: "json", inc: "url-rels+work-rels" },
	// 					headers: {
	// 						"User-Agent": "Musare/3.9.0-fork ( https://git.kvos.dev/kris/MusareFork )" // TODO set this in accordance to https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
	// 					}
	// 				};

	// 				console.log("KRIS101", options, `https://musicbrainz.org/ws/2/isrc/${ISRC}`);

	// 				axios
	// 					.get(`https://musicbrainz.org/ws/2/isrc/${ISRC}`, options)
	// 					.then(res => next(null, res.data))
	// 					.catch(err => next(err));
	// 			},

	// 			(body, next) => {
	// 				console.log("KRIS222", body);

	// 				CacheModule.runJob("HSET", { table: "musicbrainz-isrc-2", key: ISRC, value: body })
	// 					.then(() => {})
	// 					.catch(() => {});

	// 				next(null, body);
	// 			},

	// 			(body, next) => {
	// 				const response = {};

	// 				const recordingUrls = Array.from(
	// 					new Set(
	// 						body.recordings
	// 							.map(recording =>
	// 								recording.relations
	// 									.filter(
	// 										relation =>
	// 											relation["target-type"] === "url" &&
	// 											relation.url &&
	// 											// relation["type-id"] === "7e41ef12-a124-4324-afdb-fdbae687a89c" &&
	// 											(relation.url.resource.indexOf("youtu.be") !== -1 ||
	// 												relation.url.resource.indexOf("youtube.com") !== -1 ||
	// 												relation.url.resource.indexOf("soundcloud.com") !== -1)
	// 									)
	// 									.map(relation => relation.url.resource)
	// 							)
	// 							.flat()
	// 					)
	// 				);

	// 				const workIds = Array.from(
	// 					new Set(
	// 						body.recordings
	// 							.map(recording =>
	// 								recording.relations
	// 									.filter(relation => relation["target-type"] === "work" && relation.work)
	// 									.map(relation => relation.work.id)
	// 							)
	// 							.flat()
	// 					)
	// 				);

	// 				response.recordingUrls = recordingUrls;
	// 				response.workIds = workIds;

	// 				response.raw = body;

	// 				next(null, response);
	// 			}
	// 		],
	// 		async (err, response) => {
	// 			if (err && err !== true) {
	// 				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
	// 				this.log(
	// 					"ERROR",
	// 					"APIS_SEARCH_MUSICBRAINZ_ISRC",
	// 					`Searching MusicBrainz ISRC failed with ISRC "${ISRC}". "${err}"`
	// 				);
	// 				return cb({ status: "error", message: err });
	// 			}
	// 			this.log(
	// 				"SUCCESS",
	// 				"APIS_SEARCH_MUSICBRAINZ_ISRC",
	// 				`User "${session.userId}" searched MusicBrainz ISRC succesfully for ISRC "${ISRC}".`
	// 			);
	// 			return cb({
	// 				status: "success",
	// 				data: {
	// 					response
	// 				}
	// 			});
	// 		}
	// 	);
	// }),

	// /**
	//  *
	//  *
	//  * @param session
	//  * @param trackId - the trackId
	//  * @param {Function} cb
	//  */
	// searchWikidataBySpotifyTrackId: useHasPermission(
	// 	"admin.view.spotify",
	// 	function searchWikidataBySpotifyTrackId(session, trackId, cb) {
	// 		async.waterfall(
	// 			[
	// 				next => {
	// 					if (!trackId) {
	// 						next("Invalid trackId provided.");
	// 						return;
	// 					}

	// 					CacheModule.runJob("HGET", { table: "wikidata-spotify-track", key: trackId })
	// 						.then(response => {
	// 							if (response) next(null, response);
	// 							else next(null, null);
	// 						})
	// 						.catch(err => {
	// 							console.log("WOW", err);
	// 							next(err);
	// 						});
	// 				},

	// 				(body, next) => {
	// 					if (body) {
	// 						next(null, body);
	// 						return;
	// 					}

	// 					// const options = {
	// 					// 	params: { fmt: "json", inc: "url-rels" },
	// 					// 	headers: {
	// 					// 		"User-Agent": "Musare/3.9.0-fork ( https://git.kvos.dev/kris/MusareFork )" // TODO set this in accordance to https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
	// 					// 	}
	// 					// };

	// 					// axios
	// 					// 	.get(`https://musicbrainz.org/ws/2/isrc/${ISRC}`, options)
	// 					// 	.then(res => next(null, res.data))
	// 					// 	.catch(err => next(err));
	// 				},

	// 				(body, next) => {
	// 					CacheModule.runJob("HSET", { table: "musicbrainz-isrc", key: ISRC, value: body })
	// 						.then(() => {})
	// 						.catch(() => {});

	// 					next(null, body);
	// 				},

	// 				(body, next) => {
	// 					const response = {};

	// 					const recordingUrls = Array.from(
	// 						new Set(
	// 							body.recordings
	// 								.map(recording =>
	// 									recording.relations
	// 										.filter(
	// 											relation =>
	// 												relation["target-type"] === "url" &&
	// 												relation.url &&
	// 												// relation["type-id"] === "7e41ef12-a124-4324-afdb-fdbae687a89c" &&
	// 												(relation.url.resource.indexOf("youtu.be") !== -1 ||
	// 													relation.url.resource.indexOf("youtube.com") !== -1 ||
	// 													relation.url.resource.indexOf("soundcloud.com") !== -1)
	// 										)
	// 										.map(relation => relation.url.resource)
	// 								)
	// 								.flat()
	// 						)
	// 					);

	// 					response.recordingUrls = recordingUrls;

	// 					response.raw = body;

	// 					next(null, response);
	// 				}
	// 			],
	// 			async (err, response) => {
	// 				if (err && err !== true) {
	// 					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
	// 					this.log(
	// 						"ERROR",
	// 						"APIS_SEARCH_TODO",
	// 						`Searching MusicBrainz ISRC failed with ISRC "${ISRC}". "${err}"`
	// 					);
	// 					return cb({ status: "error", message: err });
	// 				}
	// 				this.log(
	// 					"SUCCESS",
	// 					"APIS_SEARCH_TODO",
	// 					`User "${session.userId}" searched MusicBrainz ISRC succesfully for ISRC "${ISRC}".`
	// 				);
	// 				return cb({
	// 					status: "success",
	// 					data: {
	// 						response
	// 					}
	// 				});
	// 			}
	// 		);
	// 	}
	// ),

	// /**
	//  *
	//  *
	//  * @param session
	//  * @param trackId - the trackId
	//  * @param {Function} cb
	//  */
	// searchWikidataByMusicBrainzWorkId: useHasPermission(
	// 	"admin.view.spotify",
	// 	function searchWikidataByMusicBrainzWorkId(session, workId, cb) {
	// 		async.waterfall(
	// 			[
	// 				next => {
	// 					if (!workId) {
	// 						next("Invalid workId provided.");
	// 						return;
	// 					}

	// 					CacheModule.runJob("HGET", { table: "wikidata-musicbrainz-work", key: workId })
	// 						.then(response => {
	// 							if (response) next(null, response);
	// 							else next(null, null);
	// 						})
	// 						.catch(err => {
	// 							next(err);
	// 						});
	// 				},

	// 				(body, next) => {
	// 					if (body) {
	// 						next(null, body);
	// 						return;
	// 					}

	// 					const endpointUrl = "https://query.wikidata.org/sparql";
	// 					const sparqlQuery = `SELECT DISTINCT ?item ?itemLabel ?YouTube_video_ID WHERE {
	// 					SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE]". }
	// 					{
	// 						SELECT DISTINCT ?item WHERE {
	// 						?item p:P435 ?statement0.
	// 						?statement0 ps:P435 "${workId}".
	// 						}
	// 						LIMIT 100
	// 					}
	// 					OPTIONAL { ?item wdt:P1651 ?YouTube_video_ID. }
	// 					}`;
	// 					// OPTIONAL { ?item wdt:P3040 ?SoundCloud_track_ID. }

	// const options = {
	// 	params: { query: sparqlQuery },
	// 	headers: {
	// 		Accept: "application/sparql-results+json"
	// 	}
	// };

	// axios
	// 	.get(endpointUrl, options)
	// 	.then(res => next(null, res.data))
	// 	.catch(err => next(err));
	// 				},

	// 				(body, next) => {
	// 					CacheModule.runJob("HSET", { table: "wikidata-musicbrainz-work", key: workId, value: body })
	// 						.then(() => {})
	// 						.catch(() => {});

	// 					next(null, body);
	// 				},

	// 				(body, next) => {
	// 					const response = {};

	// 					const youtubeIds = Array.from(
	// 						new Set(
	// 							body.results.bindings
	// 								.filter(binding => !!binding.YouTube_video_ID)
	// 								.map(binding => binding.YouTube_video_ID.value)
	// 						)
	// 					);
	// 					// const soundcloudIds = Array.from(new Set(body.results.bindings.filter(binding => !!binding["SoundCloud_track_ID"]).map(binding => binding["SoundCloud_track_ID"].value)))

	// 					response.youtubeIds = youtubeIds;

	// 					response.raw = body;

	// 					next(null, response);
	// 				}
	// 			],
	// 			async (err, response) => {
	// 				if (err && err !== true) {
	// 					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
	// 					this.log(
	// 						"ERROR",
	// 						"APIS_SEARCH_TODO",
	// 						`Searching MusicBrainz ISRC failed with ISRC "${workId}". "${err}"`
	// 					);
	// 					return cb({ status: "error", message: err });
	// 				}
	// 				this.log(
	// 					"SUCCESS",
	// 					"APIS_SEARCH_TODO",
	// 					`User "${session.userId}" searched MusicBrainz ISRC succesfully for ISRC "${workId}".`
	// 				);
	// 				return cb({
	// 					status: "success",
	// 					data: {
	// 						response
	// 					}
	// 				});
	// 			}
	// 		);
	// 	}
	// ),

	/**
	 *
	 *
	 * @param session
	 * @param trackId - the trackId
	 * @param {Function} cb
	 */
	getAlternativeMediaSourcesForTracks: useHasPermission(
		"admin.view.spotify",
		function getAlternativeMediaSourcesForTracks(session, mediaSources, collectAlternativeMediaSourcesOrigins, cb) {
			async.waterfall(
				[
					next => {
						if (!mediaSources) {
							next("Invalid mediaSources provided.");
							return;
						}

						next();
					},

					async () => {
						this.keepLongJob();
						this.publishProgress({
							status: "started",
							title: "Getting alternative media sources for Spotify tracks",
							message: "Starting up",
							id: this.toString()
						});
						console.log("KRIS@4", this.toString());
						// await CacheModule.runJob(
						// 	"RPUSH",
						// 	{ key: `longJobs.${session.userId}`, value: this.toString() },
						// 	this
						// );

						SpotifyModule.runJob(
							"GET_ALTERNATIVE_MEDIA_SOURCES_FOR_TRACKS",
							{ mediaSources, collectAlternativeMediaSourcesOrigins },
							this
						);
					}
				],
				async err => {
					if (err) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						this.log(
							"ERROR",
							"APIS_GET_ALTERNATIVE_SOURCES",
							`Getting alternative sources failed for "${mediaSources.join(", ")}". "${err}"`
						);
						return cb({ status: "error", message: err });
					}
					this.log(
						"SUCCESS",
						"APIS_GET_ALTERNATIVE_SOURCES",
						`User "${session.userId}" started getting alternatives for "${mediaSources.join(", ")}".`
					);
					return cb({
						status: "success"
					});
				}
			);
		}
	),

	/**
	 *
	 *
	 * @param session
	 * @param trackId - the trackId
	 * @param {Function} cb
	 */
	getAlternativeAlbumSourcesForAlbums: useHasPermission(
		"admin.view.spotify",
		function getAlternativeAlbumSourcesForAlbums(session, albumIds, collectAlternativeAlbumSourcesOrigins, cb) {
			async.waterfall(
				[
					next => {
						if (!albumIds) {
							next("Invalid albumIds provided.");
							return;
						}

						next();
					},

					async () => {
						this.keepLongJob();
						this.publishProgress({
							status: "started",
							title: "Getting alternative album sources for Spotify albums",
							message: "Starting up",
							id: this.toString()
						});
						console.log("KRIS@4", this.toString());
						// await CacheModule.runJob(
						// 	"RPUSH",
						// 	{ key: `longJobs.${session.userId}`, value: this.toString() },
						// 	this
						// );

						SpotifyModule.runJob(
							"GET_ALTERNATIVE_ALBUM_SOURCES_FOR_ALBUMS",
							{ albumIds, collectAlternativeAlbumSourcesOrigins },
							this
						);
					}
				],
				async err => {
					if (err) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						this.log(
							"ERROR",
							"APIS_GET_ALTERNATIVE_ALBUM_SOURCES",
							`Getting alternative album sources failed for "${albumIds.join(", ")}". "${err}"`
						);
						return cb({ status: "error", message: err });
					}
					this.log(
						"SUCCESS",
						"APIS_GET_ALTERNATIVE_ALBUM_SOURCES",
						`User "${session.userId}" started getting alternative album spirces for "${albumIds.join(
							", "
						)}".`
					);
					return cb({
						status: "success"
					});
				}
			);
		}
	),

	/**
	 *
	 *
	 * @param session
	 * @param trackId - the trackId
	 * @param {Function} cb
	 */
	getAlternativeArtistSourcesForArtists: useHasPermission(
		"admin.view.spotify",
		function getAlternativeArtistSourcesForArtists(session, artistIds, collectAlternativeArtistSourcesOrigins, cb) {
			async.waterfall(
				[
					next => {
						if (!artistIds) {
							next("Invalid artistIds provided.");
							return;
						}

						next();
					},

					async () => {
						this.keepLongJob();
						this.publishProgress({
							status: "started",
							title: "Getting alternative artist sources for Spotify artists",
							message: "Starting up",
							id: this.toString()
						});
						console.log("KRIS@4", this.toString());
						// await CacheModule.runJob(
						// 	"RPUSH",
						// 	{ key: `longJobs.${session.userId}`, value: this.toString() },
						// 	this
						// );

						SpotifyModule.runJob(
							"GET_ALTERNATIVE_ARTIST_SOURCES_FOR_ARTISTS",
							{ artistIds, collectAlternativeArtistSourcesOrigins },
							this
						);
					}
				],
				async err => {
					if (err) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						this.log(
							"ERROR",
							"APIS_GET_ALTERNATIVE_ARTIST_SOURCES",
							`Getting alternative artist sources failed for "${artistIds.join(", ")}". "${err}"`
						);
						return cb({ status: "error", message: err });
					}
					this.log(
						"SUCCESS",
						"APIS_GET_ALTERNATIVE_ARTIST_SOURCES",
						`User "${session.userId}" started getting alternative artist spirces for "${artistIds.join(
							", "
						)}".`
					);
					return cb({
						status: "success"
					});
				}
			);
		}
	),

	/**
	 * Joins a room
	 *
	 * @param {object} session - user session
	 * @param {string} room - the room to join
	 * @param {Function} cb - callback
	 */
	joinRoom(session, room, cb) {
		const roomName = room.split(".")[0];
		// const roomId = room.split(".")[1];
		const rooms = {
			home: null,
			news: null,
			profile: null,
			"view-youtube-video": null,
			"manage-station": null,
			// "manage-station": "stations.view",
			"edit-song": "songs.update",
			"edit-songs": "songs.update",
			"import-album": "songs.update",
			// "edit-playlist": "playlists.update",
			"view-report": "reports.get",
			"edit-user": "users.update",
			"view-api-request": "youtube.getApiRequest",
			"view-punishment": "punishments.get"
		};
		const join = (status, error) => {
			if (status === "success")
				WSModule.runJob("SOCKET_JOIN_ROOM", {
					socketId: session.socketId,
					room
				})
					.then(() => cb({ status: "success", message: "Successfully joined room." }))
					.catch(err => join("error", err.message));
			else {
				this.log("ERROR", `Joining room failed: ${error}`);
				cb({ status: "error", message: error });
			}
		};
		if (rooms[roomName] === null) join("success");
		else if (rooms[roomName])
			hasPermission(rooms[roomName], session)
				.then(() => join("success"))
				.catch(err => join("error", err));
		else join("error", "Room not found");
	},

	/**
	 * Leaves a room
	 *
	 * @param {object} session - user session
	 * @param {string} room - the room to leave
	 * @param {Function} cb - callback
	 */
	leaveRoom(session, room, cb) {
		if (
			room === "home" ||
			room.startsWith("profile.") ||
			room.startsWith("manage-station.") ||
			room.startsWith("edit-song.") ||
			room.startsWith("view-report.") ||
			room === "import-album" ||
			room === "edit-songs"
		) {
			WSModule.runJob("SOCKET_LEAVE_ROOM", {
				socketId: session.socketId,
				room
			})
				.then(() => {})
				.catch(err => {
					this.log("ERROR", `Leaving room failed: ${err.message}`);
				});
		}

		cb({ status: "success", message: "Successfully left room." });
	},

	/**
	 * Joins an admin room
	 *
	 * @param {object} session - user session
	 * @param {string} page - the admin room to join
	 * @param {Function} cb - callback
	 */
	joinAdminRoom(session, page, cb) {
		if (
			page === "songs" ||
			page === "stations" ||
			page === "reports" ||
			page === "news" ||
			page === "playlists" ||
			page === "users" ||
			page === "statistics" ||
			page === "punishments" ||
			page === "youtube" ||
			page === "youtubeVideos" ||
			page === "soundcloud" ||
			page === "soundcloudTracks" ||
			page === "import" ||
			page === "dataRequests"
		) {
			hasPermission(`admin.view.${page}`, session.userId)
				.then(() =>
					WSModule.runJob("SOCKET_LEAVE_ROOMS", { socketId: session.socketId }).then(() => {
						WSModule.runJob(
							"SOCKET_JOIN_ROOM",
							{
								socketId: session.socketId,
								room: `admin.${page}`
							},
							this
						).then(() => cb({ status: "success", message: "Successfully joined admin room." }));
					})
				)
				.catch(() => cb({ status: "error", message: "Failed to join admin room." }));
		}
	},

	/**
	 * Leaves all rooms
	 *
	 * @param {object} session - user session
	 * @param {Function} cb - callback
	 */
	leaveRooms(session, cb) {
		WSModule.runJob("SOCKET_LEAVE_ROOMS", { socketId: session.socketId });

		cb({ status: "success", message: "Successfully left all rooms." });
	},

	/**
	 * Returns current date
	 *
	 * @param {object} session - user session
	 * @param {Function} cb - callback
	 */
	ping(session, cb) {
		cb({ status: "success", message: "Successfully pinged.", data: { date: Date.now() } });
	}
};
