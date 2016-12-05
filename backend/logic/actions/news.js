'use strict';

const db = require('../db');

module.exports = {

	index: (session, cb) => {
		db.models.news.find({}).sort({ createdAt: 'desc' }).exec((err, news) => {
			if (err) throw err;
			else cb({ status: 'success', data: news });
		});
	},

	newest: (session, cb) => {
		db.models.news.findOne({}).sort({ createdAt: 'desc' }).exec((err, news) => {
			if (err) throw err;
			else cb({ status: 'success', data: news });
		});
	}

};