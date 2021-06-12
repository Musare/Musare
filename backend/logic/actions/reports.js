import async from "async";

import { isAdminRequired, isLoginRequired } from "./hooks";

import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const WSModule = moduleManager.modules.ws;
const SongsModule = moduleManager.modules.songs;
const CacheModule = moduleManager.modules.cache;
const ActivitiesModule = moduleManager.modules.activities;

CacheModule.runJob("SUB", {
	channel: "report.resolve",
	cb: reportId => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.reports",
			args: ["event:admin.report.resolved", { data: { reportId } }]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "report.create",
	cb: report => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.reports",
			args: ["event:admin.report.created", { data: { report } }]
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
		const reportModel = await DBModule.runJob("GET_MODEL", { modelName: "report" }, this);

		async.waterfall(
			[next => reportModel.find({ resolved: false }).sort({ released: "desc" }).exec(next)],
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
		const reportModel = await DBModule.runJob("GET_MODEL", { modelName: "report" }, this);

		async.waterfall([next => reportModel.findOne({ _id: reportId }).exec(next)], async (err, report) => {
			if (err) {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log("ERROR", "REPORTS_FIND_ONE", `Finding report "${reportId}" failed. "${err}"`);
				return cb({ status: "error", message: err });
			}

			this.log("SUCCESS", "REPORTS_FIND_ONE", `Finding report "${reportId}" successful.`);
			return cb({ status: "success", data: { report } });
		});
	}),

	/**
	 * Gets all reports for a songId
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} songId - the id of the song to index reports for
	 * @param {Function} cb - gets called with the result
	 */
	getReportsForSong: isAdminRequired(async function getReportsForSong(session, songId, cb) {
		const reportModel = await DBModule.runJob("GET_MODEL", { modelName: "report" }, this);

		async.waterfall(
			[
				next => {
					reportModel
						.find({ song: { _id: songId }, resolved: false })
						.sort({ released: "desc" })
						.exec(next);
				},

				(_reports, next) => {
					const reports = [];
					for (let i = 0; i < _reports.length; i += 1) {
						reports.push(_reports[i]._id);
					}
					next(null, reports);
				}
			],
			async (err, reports) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "GET_REPORTS_FOR_SONG", `Indexing reports for song "${songId}" failed. "${err}"`);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "GET_REPORTS_FOR_SONG", `Indexing reports for song "${songId}" successful.`);
				return cb({ status: "success", data: { reports } });
			}
		);
	}),

	/**
	 * Resolves a reported issue
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} reportId - the id of the report that is getting resolved
	 * @param {Function} cb - gets called with the result
	 */
	resolve: isAdminRequired(async function resolve(session, reportId, cb) {
		const reportModel = await DBModule.runJob("GET_MODEL", { modelName: "report" }, this);

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
	 * @param {object} report - the object of the report data
	 * @param {string} report.youtubeId - the youtube id of the song that is being reported
	 * @param {Array} report.issues - all issues reported (custom or defined)
	 * @param {Function} cb - gets called with the result
	 */
	create: isLoginRequired(async function create(session, report, cb) {
		const reportModel = await DBModule.runJob("GET_MODEL", { modelName: "report" }, this);
		const songModel = await DBModule.runJob("GET_MODEL", { modelName: "song" }, this);

		const { youtubeId } = report;

		// properties for every report issue that is saved to db
		const template = {};

		async.waterfall(
			[
				next => songModel.findOne({ youtubeId }).exec(next),

				(song, next) => {
					if (!song) return next("Song not found.");

					return SongsModule.runJob("GET_SONG", { songId: song._id }, this)
						.then(res => next(null, res.song))
						.catch(next);
				},

				(song, next) => {
					if (!song) return next("Song not found.");

					template.song = {
						_id: song._id,
						youtubeId: song.youtubeId
					};

					return next(null, { title: song.title, artists: song.artists, thumbnail: song.thumbnail });
				},

				(song, next) => {
					template.createdBy = session.userId;
					template.createdAt = Date.now();

					return async.each(
						report.issues,
						(issue, next) => {
							reportModel.create({ ...issue, ...template }, (err, value) => {
								CacheModule.runJob("PUB", {
									channel: "report.create",
									value
								});

								return next(err);
							});
						},
						err => next(err, report, song)
					);
				}
			],
			async (err, report, song) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"REPORTS_CREATE",
						`Creating report for "${template.song._id}" failed by user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: template.createdBy,
					type: "song__report",
					payload: {
						message: `Reported song <youtubeId>${song.title} by ${song.artists.join(", ")}</youtubeId>`,
						youtubeId: template.song.youtubeId,
						thumbnail: song.thumbnail
					}
				});

				this.log("SUCCESS", "REPORTS_CREATE", `User "${session.userId}" created report for "${youtubeId}".`);

				return cb({
					status: "success",
					message: "Successfully created report"
				});
			}
		);
	})
};
