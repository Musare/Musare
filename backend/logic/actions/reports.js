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
	channel: "report.issue.toggle",
	cb: data =>
		WSModule.runJob("EMIT_TO_ROOMS", {
			rooms: [`edit-song.${data.songId}`, `view-report.${data.reportId}`],
			args: [
				"event:admin.report.issue.toggled",
				{ data: { issueId: data.issueId, reportId: data.reportId, resolved: data.resolved } }
			]
		})
});

CacheModule.runJob("SUB", {
	channel: "report.resolve",
	cb: ({ reportId, songId }) =>
		WSModule.runJob("EMIT_TO_ROOMS", {
			rooms: ["admin.reports", `edit-song.${songId}`, `view-report.${reportId}`],
			args: ["event:admin.report.resolved", { data: { reportId } }]
		})
});

CacheModule.runJob("SUB", {
	channel: "report.create",
	cb: report => {
		console.log(report);

		DBModule.runJob("GET_MODEL", { modelName: "user" }, this).then(userModel => {
			userModel
				.findById(report.createdBy)
				.select({ avatar: -1, name: -1, username: -1 })
				.exec((err, { avatar, name, username }) => {
					report.createdBy = {
						avatar,
						name,
						username,
						_id: report.createdBy
					};

					WSModule.runJob("EMIT_TO_ROOMS", {
						rooms: ["admin.reports", `edit-song.${report.song._id}`],
						args: ["event:admin.report.created", { data: { report } }]
					});
				});
		});
	}
});

export default {
	/**
	 * Gets reports, used in the admin reports page by the AdvancedTable component
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param page - the page
	 * @param pageSize - the size per page
	 * @param properties - the properties to return for each user
	 * @param sort - the sort object
	 * @param queries - the queries array
	 * @param operator - the operator for queries
	 * @param cb
	 */
	getData: isAdminRequired(async function getSet(session, page, pageSize, properties, sort, queries, operator, cb) {
		const reportModel = await DBModule.runJob("GET_MODEL", { modelName: "report" }, this);

		const newQueries = queries.map(query => {
			const { data, filter, filterType } = query;
			const newQuery = {};
			if (filterType === "regex") {
				newQuery[filter.property] = new RegExp(`${data.slice(1, data.length - 1)}`, "i");
			} else if (filterType === "contains") {
				newQuery[filter.property] = new RegExp(`${data.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
			} else if (filterType === "exact") {
				newQuery[filter.property] = data.toString();
			}
			return newQuery;
		});

		const queryObject = {};
		if (newQueries.length > 0) {
			if (operator === "and") queryObject.$and = newQueries;
			else if (operator === "or") queryObject.$or = newQueries;
			else if (operator === "nor") queryObject.$nor = newQueries;
		}

		async.waterfall(
			[
				next => {
					reportModel.find(queryObject).count((err, count) => {
						next(err, count);
					});
				},

				(count, next) => {
					reportModel
						.find(queryObject)
						.sort(sort)
						.skip(pageSize * (page - 1))
						.limit(pageSize)
						.select(properties.join(" "))
						.exec((err, reports) => {
							next(err, count, reports);
						});
				}
			],
			async (err, count, reports) => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "REPORTS_GET_DATA", `Failed to get data from reports. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "REPORTS_GET_DATA", `Got data from reports successfully.`);
				return cb({
					status: "success",
					message: "Successfully got data from reports.",
					data: { data: reports, count }
				});
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
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => reportModel.findOne({ _id: reportId }).exec(next),
				(report, next) =>
					userModel
						.findById(report.createdBy)
						.select({ avatar: -1, name: -1, username: -1 })
						.exec((err, user) => {
							if (!user)
								next(err, {
									...report._doc,
									createdBy: { _id: report.createdBy }
								});
							else
								next(err, {
									...report._doc,
									createdBy: {
										avatar: user.avatar,
										name: user.name,
										username: user.username,
										_id: report.createdBy
									}
								});
						})
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
		const reportModel = await DBModule.runJob("GET_MODEL", { modelName: "report" }, this);
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next =>
					reportModel.find({ "song._id": songId, resolved: false }).sort({ createdAt: "desc" }).exec(next),

				(_reports, next) => {
					const reports = [];

					async.each(
						_reports,
						(report, cb) => {
							userModel
								.findById(report.createdBy)
								.select({ avatar: -1, name: -1, username: -1 })
								.exec((err, user) => {
									if (!user)
										reports.push({
											...report._doc,
											createdBy: { _id: report.createdBy }
										});
									else
										reports.push({
											...report._doc,
											createdBy: {
												avatar: user.avatar,
												name: user.name,
												username: user.username,
												_id: report.createdBy
											}
										});

									return cb(err);
								});
						},
						err => next(err, reports)
					);
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
	 * Gets all a users reports for a specific songId
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} songId - the id of the song
	 * @param {Function} cb - gets called with the result
	 */
	myReportsForSong: isLoginRequired(async function myReportsForSong(session, songId, cb) {
		const reportModel = await DBModule.runJob("GET_MODEL", { modelName: "report" }, this);
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next =>
					reportModel
						.find({ "song._id": songId, createdBy: session.userId, resolved: false })
						.sort({ createdAt: "desc" })
						.exec(next),

				(_reports, next) => {
					const reports = [];

					async.each(
						_reports,
						(report, cb) => {
							userModel
								.findById(report.createdBy)
								.select({ avatar: -1, name: -1, username: -1 })
								.exec((err, user) => {
									if (!user)
										reports.push({
											...report._doc,
											createdBy: { _id: report.createdBy }
										});
									else
										reports.push({
											...report._doc,
											createdBy: {
												avatar: user.avatar,
												name: user.name,
												username: user.username,
												_id: report.createdBy
											}
										});

									return cb(err);
								});
						},
						err => next(err, reports)
					);
				}
			],
			async (err, reports) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"MY_REPORTS_FOR_SONG",
						`Indexing reports of user ${session.userId} for song "${songId}" failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"MY_REPORTS_FOR_SONG",
					`Indexing reports of user ${session.userId} for song "${songId}" successful.`
				);

				return cb({ status: "success", data: { reports } });
			}
		);
	}),

	/**
	 * Resolves a report as a whole
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
					reportModel.findById(reportId).exec(next);
				},

				(report, next) => {
					if (!report) return next("Report not found.");

					report.resolved = true;

					return report.save(err => {
						if (err) return next(err.message);
						return next(null, report.song._id);
					});
				}
			],
			async (err, songId) => {
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
					value: { reportId, songId }
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
	 * Resolves/Unresolves an issue within a report
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} reportId - the id of the report that is getting resolved
	 * @param {string} issueId - the id of the issue within the report
	 * @param {Function} cb - gets called with the result
	 */
	toggleIssue: isAdminRequired(async function toggleIssue(session, reportId, issueId, cb) {
		const reportModel = await DBModule.runJob("GET_MODEL", { modelName: "report" }, this);

		async.waterfall(
			[
				next => {
					reportModel.findById(reportId).exec(next);
				},

				(report, next) => {
					if (!report) return next("Report not found.");

					const issue = report.issues.find(issue => issue._id.toString() === issueId);
					issue.resolved = !issue.resolved;

					return report.save(err => {
						if (err) return next(err.message);
						return next(null, issue.resolved, report.song._id);
					});
				}
			],
			async (err, resolved, songId) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"REPORTS_TOGGLE_ISSUE",
						`Resolving an issue within report "${reportId}" failed by user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				CacheModule.runJob("PUB", {
					channel: "report.issue.toggle",
					value: { reportId, issueId, songId, resolved }
				});

				this.log(
					"SUCCESS",
					"REPORTS_TOGGLE_ISSUE",
					`User "${session.userId}" resolved an issue in report "${reportId}".`
				);

				return cb({
					status: "success",
					message: "Successfully resolved issue within report"
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

					delete report.youtubeId;
					report.song = {
						_id: song._id,
						youtubeId: song.youtubeId
					};

					return next(null, { title: song.title, artists: song.artists, thumbnail: song.thumbnail });
				},

				(song, next) =>
					reportModel.create(
						{
							createdBy: session.userId,
							createdAt: Date.now(),
							...report
						},
						(err, report) => next(err, report, song)
					)
			],
			async (err, report, song) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"REPORTS_CREATE",
						`Creating report for "${report.song._id}" failed by user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "song__report",
					payload: {
						message: `Created a <reportId>${report._id}</reportId> for song <youtubeId>${song.title}</youtubeId>`,
						youtubeId: report.song.youtubeId,
						reportId: report._id,
						thumbnail: song.thumbnail
					}
				});

				CacheModule.runJob("PUB", {
					channel: "report.create",
					value: report
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
