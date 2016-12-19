'use strict';

const async = require('async');

const db = require('../db');
const cache = require('../cache');
const utils = require('../utils');
const hooks = require('./hooks');

cache.sub('news.create', news => {
	utils.socketsFromUser(news.createdBy, sockets => {
		sockets.forEach(socket => {
			socket.emit('event:admin.news.created', news);
		});
	});
});

module.exports = {

	index: (session, cb) => {
		db.models.news.find({}).sort({ createdAt: 'desc' }).exec((err, news) => {
			if (err) throw err;
			else cb({ status: 'success', data: news });
		});
	},

	create: hooks.adminRequired((session, data, cb, userId) => {
		async.waterfall([

			(next) => {
				data.createdBy = userId;
				data.createdAt = Date.now();
				db.models.news.create(data, next);
			}

		], (err, news) => {
			console.log(err);
			if (err) return cb({ 'status': 'failure', 'message': 'Something went wrong' });
			else {
				cache.pub('news.create', news);
				return cb({ 'status': 'success', 'message': 'Successfully created News' });
			}
		});
	}),

	newest: (session, cb) => {
		db.models.news.findOne({}).sort({ createdAt: 'desc' }).exec((err, news) => {
			if (err) throw err;
			else cb({ status: 'success', data: news });
		});
	}

};