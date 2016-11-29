'use strict';

const db = require('../db');

module.exports = {

	index: (session, cb) => {
		db.models.reports.find({}).sort({ released: 'desc' }).exec((err, reports) => {
			if (err) throw err;
			else cb({ status: 'success', data: reports });
		});
	},

	add: (session, report, cb) => {
		console.log(report);
	}

};