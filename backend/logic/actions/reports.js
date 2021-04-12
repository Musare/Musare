import async from "async";

import { isAdminRequired, isLoginRequired } from "./hooks";

import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const WSModule = moduleManager.modules.ws;
const SongsModule = moduleManager.modules.songs;
const CacheModule = moduleManager.modules.cache;
const ActivitiesModule = moduleManager.modules.activities;

const reportableIssues = [
	{
		name: "Video",
		reasons: ["Doesn't exist", "It's private", "It's not available in my country"]
	},
	{
		name: "Title",
		reasons: ["Incorrect", "Inappropriate"]
	},
	{
		name: "Duration",
		reasons: ["Skips too soon", "Skips too late", "Starts too soon", "Skips too late"]
	},
	{
		name: "Artists",
		reasons: ["Incorrect", "Inappropriate"]
	},
	{
		name: "Thumbnail",
		reasons: ["Incorrect", "Inappropriate", "Doesn't exist"]
	}
];

CacheModule.runJob("SUB", {
	channel: "report.resolve",
	cb: reportId => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.reports",
			args: ["event:admin.report.resolved", reportId]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "report.create",
	cb: report => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.reports",
			args: ["event:admin.report.created", report]
		});
	}
});

export default {
	/**
	 * Gets all reports
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Function} cb - gets called with the result
	 */
	index: isAdminRequired(async function index(session, cb) {
		const reportModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "report"
			},
			this
		);
		async.waterfall(
			[
				next => {
					reportModel.find({ resolved: false }).sort({ released: "desc" }).exec(next);
				}
			],
			async (err, reports) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "REPORTS_INDEX", `Indexing reports failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "REPORTS_INDEX", "Indexing reports successful.");
				return cb({ status: "success", data: { reports } });
			}
		);
	}),

	/**
	 * Gets a specific report
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} reportId - the id of the report to return
	 * @param {Function} cb - gets called with the result
	 */
	findOne: isAdminRequired(async function findOne(session, reportId, cb) {
		const reportModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "report"
			},
			this
		);
		async.waterfall(
			[
				next => {
					reportModel.findOne({ _id: reportId }).exec(next);
				}
			],
			async (err, report) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "REPORTS_FIND_ONE", `Finding report "${reportId}" failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "REPORTS_FIND_ONE", `Finding report "${reportId}" successful.`);
				return cb({ status: "success", data: { report } });
			}
		);
	}),

	/**
	 * Gets all reports for a songId
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} songId - the id of the song to index reports for
	 * @param {Function} cb - gets called with the result
	 */
	getReportsForSong: isAdminRequired(async function getReportsForSong(session, songId, cb) {
		const reportModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "report"
			},
			this
		);
		async.waterfall(
			[
				next => {
					reportModel
						.find({ song: { _id: songId }, resolved: false })
						.sort({ released: "desc" })
						.exec(next);
				},

				(reports, next) => {
					const data = [];
					for (let i = 0; i < reports.length; i += 1) {
						data.push(reports[i]._id);
					}
					next(null, data);
				}
			],
			async (err, data) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "GET_REPORTS_FOR_SONG", `Indexing reports for song "${songId}" failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "GET_REPORTS_FOR_SONG", `Indexing reports for song "${songId}" successful.`);
				return cb({ status: "success", data });
			}
		);
	}),

	/**
	 * Resolves a report
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} reportId - the id of the report that is getting resolved
	 * @param {Function} cb - gets called with the result
	 */
	resolve: isAdminRequired(async function resolve(session, reportId, cb) {
		const reportModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "report"
			},
			this
		);
		async.waterfall(
			[
				next => {
					reportModel.findOne({ _id: reportId }).exec(next);
				},

				(report, next) => {
					if (!report) return next("Report not found.");
					report.resolved = true;
					return report.save(err => {
						if (err) return next(err.message);
						return next();
					});
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"REPORTS_RESOLVE",
						`Resolving report "${reportId}" failed by user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}
				CacheModule.runJob("PUB", {
					channel: "report.resolve",
					value: reportId
				});
				this.log("SUCCESS", "REPORTS_RESOLVE", `User "${session.userId}" resolved report "${reportId}".`);
				return cb({
					status: "success",
					message: "Successfully resolved Report"
				});
			}
		);
	}),

	/**
	 * Creates a new report
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {object} data - the object of the report data
	 * @param {Function} cb - gets called with the result
	 */
	create: isLoginRequired(async function create(session, data, cb) {
		const reportModel = await DBModule.runJob("GET_MODEL", { modelName: "report" }, this);
		const songModel = await DBModule.runJob("GET_MODEL", { modelName: "song" }, this);

		async.waterfall(
			[
				next => {
					songModel.findOne({ youtubeId: data.youtubeId }).exec(next);
				},

				(song, next) => {
					if (!song) return next("Song not found.");

					return SongsModule.runJob("GET_SONG", { songId: song._id }, this)
						.then(res => next(null, res.song))
						.catch(next);
				},

				(song, next) => {
					if (!song) return next("Song not found.");

					delete data.youtubeId;
					data.song = {
						_id: song._id,
						youtubeId: song.youtubeId
					};

					for (let z = 0; z < data.issues.length; z += 1) {
						if (reportableIssues.filter(issue => issue.name === data.issues[z].name).length > 0) {
							for (let r = 0; r < reportableIssues.length; r += 1) {
								if (
									reportableIssues[r].reasons.every(
										reason => data.issues[z].reasons.indexOf(reason) < -1
									)
								) {
									return cb({
										status: "error",
										message: "Invalid data"
									});
								}
							}
						} else
							return cb({
								status: "error",
								message: "Invalid data"
							});
					}

					return next(null, { title: song.title, artists: song.artists, thumbnail: song.thumbnail });
				},

				(song, next) => {
					const issues = [];

					for (let r = 0; r < data.issues.length; r += 1) {
						if (!data.issues[r].reasons.length <= 0) issues.push(data.issues[r]);
					}

					data.issues = issues;

					next(null, song);
				},

				(song, next) => {
					data.createdBy = session.userId;
					data.createdAt = Date.now();

					reportModel.create(data, (err, report) => next(err, report, song));
				}
			],
			async (err, report, song) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"REPORTS_CREATE",
						`Creating report for "${data.song._id}" failed by user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				CacheModule.runJob("PUB", {
					channel: "report.create",
					value: report
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: report.createdBy,
					type: "song__report",
					payload: {
						message: `Reported song <youtubeId>${song.title} by ${song.artists.join(", ")}</youtubeId>`,
						songId: data.song._id,
						thumbnail: song.thumbnail
					}
				});

				this.log(
					"SUCCESS",
					"REPORTS_CREATE",
					`User "${session.userId}" created report for "${data.youtubeId}".`
				);

				return cb({
					status: "success",
					message: "Successfully created report"
				});
			}
		);
	})
};
