'use strict';

const async = require('async');

const db = require('../db');
const cache = require('../cache');
const utils = require('../utils');
const logger = require('../logger');
const hooks = require('./hooks');
const songs = require('../songs');
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
		], (err, reports) => {
			if (err) {
				err = utils.getError(err);
				logger.error("REPORTS_INDEX", `Indexing reports failed. "${err}"`);
				return cb({ 'status': 'failure', 'message': err});
			}
			logger.success("REPORTS_INDEX", "Indexing reports successful.");
			cb({ status: 'success', data: reports });
		});
	}),

	/**
	 * Gets all reports for a songId
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} songId - the id of the song to index reports for
	 * @param {Function} cb - gets called with the result
	 */
	getReportsForSong: hooks.adminRequired((session, songId, cb) => {
		async.waterfall([
			(next) => {
				db.models.report.find({ songId, resolved: false }).sort({ released: 'desc' }).exec(next);
			}
		], (err, reports) => {
			if (err) {
				err = utils.getError(err);
				logger.error("REPORTS_GETFORSONG", `Indexing reports for song "${songId}" failed. "${err}"`);
				return cb({ 'status': 'failure', 'message': err});
			} else {
				logger.success("REPORTS_GETFORSONG", `Indexing report for song "{songId}" successful.`);
				return cb({ status: 'success', data: reports.length });
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
		], (err) => {
			if (err) {
				err = utils.getError(err);
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
				songs.getSong(data.songId, next);
			},

			(song, next) => {
				if (!song) return next('Song not found.');


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

		], (err, report) => {
			if (err) {
				err = utils.getError(err);
				logger.error("REPORTS_CREATE", `Creating report for "${data.songId}" failed by user "${userId}". "${err}"`);
				return cb({ 'status': 'failure', 'message': err });
			}
			else {
				cache.pub('report.create', report);
				logger.success("REPORTS_CREATE", `User "${userId}" created report for "${data.songId}".`);
				return cb({ 'status': 'success', 'message': 'Successfully created report' });
			}
		});
	})

};