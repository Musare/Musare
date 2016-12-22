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

cache.sub('news.remove', news => {
	utils.socketsFromUser(news.createdBy, sockets => {
		sockets.forEach(socket => {
			socket.emit('event:admin.news.removed', news);
		});
	});
});

cache.sub('news.update', news => {
	utils.socketsFromUser(news.createdBy, sockets => {
		sockets.forEach(socket => {
			socket.emit('event:admin.news.updated', news);
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

	remove: hooks.adminRequired((session, news, cb, userId) => {
		db.models.news.remove({ _id: news._id }, err => {
			if (err) {
				logger.log("NEWS_REMOVE", "ERROR", `Creating news failed. "${err.message}"`);
				return cb({ 'status': 'failure', 'message': 'Something went wrong' });
			} else {
				cache.pub('news.remove', news);
				logger.log("NEWS_REMOVE", "SUCCESS", `Removing news successful.`);
				return cb({ 'status': 'success', 'message': 'Successfully removed News' });
			}
		});
	}),

	update: hooks.adminRequired((session, _id, news, cb, userId) => {
		db.models.news.update({ _id }, news, { upsert: true }, err => {
			if (err) {
				logger.log("NEWS_UPDATE", "ERROR", `Updating news failed. "${err.message}"`);
				return cb({ 'status': 'failure', 'message': 'Something went wrong' });
			} else {
				cache.pub('news.update', news);
				logger.log("NEWS_UPDATE", "SUCCESS", `Updating news successful.`);
				return cb({ 'status': 'success', 'message': 'Successfully updated News' });
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