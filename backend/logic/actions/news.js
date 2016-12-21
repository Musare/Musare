'use strict';

const async = require('async');

const db = require('../db');
const cache = require('../cache');
const utils = require('../utils');
const logger = require('../logger');
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
		async.waterfall([
			(next) => {
				db.models.news.find({}).sort({ createdAt: 'desc' }).exec(next);
			}
		], (err, news) => {
			if (err) {
				logger.log("NEWS_INDEX", "ERROR", `Indexing news failed. "${err.message}"`);
				return cb({status: 'failure', message: 'Something went wrong.'});
			}
			logger.log("NEWS_INDEX", "SUCCESS", `Indexing news successful.`);
			return cb({ status: 'success', data: news });
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
			if (err) {
				logger.log("NEWS_CREATE", "ERROR", `Creating news failed. "${err.message}"`);
				return cb({ 'status': 'failure', 'message': 'Something went wrong' });
			} else {
				cache.pub('news.create', news);
				logger.log("NEWS_CREATE", "SUCCESS", `Creating news successful.`);
				return cb({ 'status': 'success', 'message': 'Successfully created News' });
			}
		});
	}),

	newest: (session, cb) => {
		async.waterfall([
			(next) => {
				db.models.news.findOne({}).sort({ createdAt: 'desc' }).exec(next);
			}
		], (err, news) => {
			if (err) {
				logger.log("NEWS_NEWEST", "ERROR", `Getting the latest news failed. "${err.message}"`);
				return cb({ 'status': 'failure', 'message': 'Something went wrong' });
			} else {
				logger.log("NEWS_NEWEST", "SUCCESS", `Successfully got the latest news.`);
				return cb({ status: 'success', data: news });
			}
		});
	}

};