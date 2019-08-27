'use strict';

const async = require('async');

const hooks = require('./hooks');

const moduleManager = require("../../index");

const db = moduleManager.modules["db"];
const cache = moduleManager.modules["cache"];
const utils = moduleManager.modules["utils"];
const logger = moduleManager.modules["logger"];
const songs = moduleManager.modules["songs"];

const reportableIssues = [
	{
		name: 'Video',
		reasons: [
			'Doesn\'t exist',
			'It\'s private',
			'It\'s not available in my country'
		]
	},
	{
		name: 'Title',
		reasons: [
			'Incorrect',
			'Inappropriate'
		]
	},
	{
		name: 'Duration',
		reasons: [
			'Skips too soon',
			'Skips too late',
			'Starts too soon',
			'Skips too late'
		]
	},
	{
		name: 'Artists',
		reasons: [
			'Incorrect',
			'Inappropriate'
		]
	},
	{
		name: 'Thumbnail',
		reasons: [
			'Incorrect',
			'Inappropriate',
			'Doesn\'t exist'
		]
	}
];

cache.sub('report.resolve', reportId => {
	utils.emitToRoom('admin.reports', 'event:admin.report.resolved', reportId);
});

cache.sub('report.create', report => {
	utils.emitToRoom('admin.reports', 'event:admin.report.created', report);
});

module.exports = {

	/**
	 * Gets all reports
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	index: hooks.adminRequired((session, cb) => {
		async.waterfall([
			(next) => {
				db.models.report.find({ resolved: false }).sort({ released: 'desc' }).exec(next);
			}
		], async (err, reports) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("REPORTS_INDEX", `Indexing reports failed. "${err}"`);
				return cb({ 'status': 'failure', 'message': err});
			}
			logger.success("REPORTS_INDEX", "Indexing reports successful.");
			cb({ status: 'success', data: reports });
		});
	}),

	/**
	 * Gets a specific report
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} reportId - the id of the report to return
	 * @param {Function} cb - gets called with the result
	 */
	findOne: hooks.adminRequired((session, reportId, cb) => {
		async.waterfall([
			(next) => {
				db.models.report.findOne({ _id: reportId }).exec(next);
			}
		], async (err, report) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("REPORTS_FIND_ONE", `Finding report "${reportId}" failed. "${err}"`);
				return cb({ 'status': 'failure', 'message': err });
			}
			logger.success("REPORTS_FIND_ONE", `Finding report "${reportId}" successful.`);
			cb({ status: 'success', data: report });
		});
	}),

	/**
	 * Gets all reports for a songId (_id)
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} songId - the id of the song to index reports for
	 * @param {Function} cb - gets called with the result
	 */
	getReportsForSong: hooks.adminRequired((session, songId, cb) => {
		async.waterfall([
			(next) => {
				db.models.report.find({ song: { _id: songId }, resolved: false }).sort({ released: 'desc' }).exec(next);
			},

			(reports, next) => {
				let data = [];
				for (let i = 0; i < reports.length; i++) {
					data.push(reports[i]._id);
				}
				next(null, data);
			}
		], async (err, data) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("GET_REPORTS_FOR_SONG", `Indexing reports for song "${songId}" failed. "${err}"`);
				return cb({ 'status': 'failure', 'message': err});
			} else {
				logger.success("GET_REPORTS_FOR_SONG", `Indexing reports for song "${songId}" successful.`);
				return cb({ status: 'success', data });
			}
		});
	}),

	/**
	 * Resolves a report
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} reportId - the id of the report that is getting resolved
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	resolve: hooks.adminRequired((session, reportId, cb, userId) => {
		async.waterfall([
			(next) => {
				db.models.report.findOne({ _id: reportId }).exec(next);
			},

			(report, next) => {
				if (!report) return next('Report not found.');
				report.resolved = true;
				report.save(err => {
					if (err) next(err.message);
					else next();
				});
			}
		], async (err) => {
			if (err) {
				err = await  utils.getError(err);
				logger.error("REPORTS_RESOLVE", `Resolving report "${reportId}" failed by user "${userId}". "${err}"`);
				return cb({ 'status': 'failure', 'message': err});
			} else {
				cache.pub('report.resolve', reportId);
				logger.success("REPORTS_RESOLVE", `User "${userId}" resolved report "${reportId}".`);
				cb({ status: 'success', message: 'Successfully resolved Report' });
			}
		});
	}),

	/**
	 * Creates a new report
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {Object} data - the object of the report data
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	create: hooks.loginRequired((session, data, cb, userId) => {
		async.waterfall([

			(next) => {
				db.models.song.findOne({ songId: data.songId }).exec(next);
			},

			(song, next) => {
				if (!song) return next('Song not found.');
				songs.getSong(song._id, next);
			},

			(song, next) => {
				if (!song) return next('Song not found.');

				delete data.songId;
				data.song = {
					_id: song._id,
					songId: song.songId
				}

				for (let z = 0; z < data.issues.length; z++) {
					if (reportableIssues.filter(issue => { return issue.name == data.issues[z].name; }).length > 0) {
						for (let r = 0; r < reportableIssues.length; r++) {
							if (reportableIssues[r].reasons.every(reason => data.issues[z].reasons.indexOf(reason) < -1)) {
								return cb({ status: 'failure', message: 'Invalid data' });
							}
						}
					} else return cb({ status: 'failure', message: 'Invalid data' });
				}

				next();
			},

			(next) => {
				let issues = [];

				for (let r = 0; r < data.issues.length; r++) {
					if (!data.issues[r].reasons.length <= 0) issues.push(data.issues[r]);
				}

				data.issues = issues;

				next();
			},

			(next) => {
				data.createdBy = userId;
				data.createdAt = Date.now();
				db.models.report.create(data, next);
			}

		], async (err, report) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("REPORTS_CREATE", `Creating report for "${data.song._id}" failed by user "${userId}". "${err}"`);
				return cb({ 'status': 'failure', 'message': err });
			} else {
				cache.pub('report.create', report);
				logger.success("REPORTS_CREATE", `User "${userId}" created report for "${data.songId}".`);
				return cb({ 'status': 'success', 'message': 'Successfully created report' });
			}
		});
	})

};
