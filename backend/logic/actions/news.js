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
		// db.models.news.create({
		// 	title: 'Beta',
		// 	description: 'Remember to let us know in Discord if you notice anything odd!',
		// 	upcoming: ['Private Playlists', 'Christmas Magic', 'Reports'],
		// 	bugs: ['Mobile Responsiveness',	'Station Name Overflow'],
		// 	improvements: ['No more Meteor Glitches!'],
		// 	createdAt: Date.now(),
		// 	createdBy: 'Jonathan (Musare Lead Developer)'
		// });
		db.models.news.findOne({}).sort({ createdAt: 'desc' }).exec((err, news) => {
			if (err) throw err;
			else cb({ status: 'success', data: news });
		});
	}

};