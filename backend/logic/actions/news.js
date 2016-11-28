'use strict';

const db = require('../db');

module.exports = {

	index: (session, cb) => {
		console.log(1234);
		db.models.news.find({}).sort({ released: 'desc' }).exec((err, news) => {
			console.log(123456, err);
			if (err) throw err;
			else cb({ status: 'success', data: news });
		});
	},

	newest: (session, cb) => {
		db.models.news.findOne({}).sort({ released: 'asc' }).exec((err, news) => {
			if (err) throw err;
			else cb({ status: 'success', data: news });
		});
	}

};