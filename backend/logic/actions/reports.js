'use strict';

const async = require('async');

const db = require('../db');
const hooks = require('./hooks');
const songs = require('../songs');

module.exports = {

	index: hooks.adminRequired((session, cb) => {
		db.models.report.find({ resolved: false }).sort({ released: 'desc' }).exec((err, reports) => {
			if (err) console.error(err);
			cb({ status: 'success', data: reports });
		});
	}),

	resolve: hooks.adminRequired((session, _id, cb) => {
		db.models.report.findOne({ _id }).sort({ released: 'desc' }).exec((err, report) => {
			if (err) console.error(err);
			report.resolved = true;
			report.save(err => {
				if (err) console.error(err);
				else cb({ status: 'success', message: 'Successfully resolved Report' });
			});
		});
	}),

	create: hooks.loginRequired((session, data, cb, userId) => {
		async.waterfall([

			(next) => {
				songs.getSong(data.songId, (err, song) => {
					if (err) return next(err);
					if (!song) return next('Song does not exist in our Database.');
					next();
				});
			},

			(next) => {
				let issues = [
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

				for (let z = 0; z < data.issues.length; z++) {
					if (issues.filter(issue => { return issue.name == data.issues[z].name; }).length > 0) {
						for (let r = 0; r < issues.length; r++) {
							if (issues[r].reasons.every(reason => data.issues[z].reasons.indexOf(reason) < -1)) {
								return cb({ 'status': 'failure', 'message': 'Invalid data' });
							}
						}
					} else return cb({ 'status': 'failure', 'message': 'Invalid data' });
				}

				next();
			},

			(next) => {
				data.createdBy = userId;
				data.createdAt = Date.now();
				db.models.report.create(data, next);
			}

		], err => {
			if (err) return cb({ 'status': 'failure', 'message': 'Something went wrong'});
			return cb({ 'status': 'success', 'message': 'Successfully created report' });
		});
	})

};