'use strict';

const db = require('../db');
const hooks = require('./hooks');

module.exports = {

	index: hooks.adminRequired((session, cb) => {
		db.models.reports.find({}).sort({ released: 'desc' }).exec((err, reports) => {
			if (err) throw err;
			else cb({ status: 'success', data: reports });
		});
	}),

	add: hooks.loginRequired((session, report, cb) => {
		console.log(report);
	})

};