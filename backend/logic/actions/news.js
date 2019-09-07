'use strict';

const async = require('async');

const hooks = require('./hooks');
const moduleManager = require("../../index");

const db = moduleManager.modules["db"];
const cache = moduleManager.modules["cache"];
const utils = moduleManager.modules["utils"];
const logger = moduleManager.modules["logger"];

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

	/**
	 * Gets all news items
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	index: (session, cb) => {
		async.waterfall([
			(next) => {
				db.models.news.find({}).sort({ createdAt: 'desc' }).exec(next);
			}
		], async (err, news) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("NEWS_INDEX", `Indexing news failed. "${err}"`);
				return cb({status: 'failure', message: err});
			}
			logger.success("NEWS_INDEX", `Indexing news successful.`, false);
			return cb({ status: 'success', data: news });
		});
	},

	/**
	 * Creates a news item
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {Object} data - the object of the news data
	 * @param {Function} cb - gets called with the result
	 */
	create: hooks.adminRequired((session, data, cb) => {
		async.waterfall([
			(next) => {
				data.createdBy = session.userId;
				data.createdAt = Date.now();
				db.models.news.create(data, next);
			}
		], async (err, news) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("NEWS_CREATE", `Creating news failed. "${err}"`);
				return cb({ 'status': 'failure', 'message': err });
			}
			cache.pub('news.create', news);
			logger.success("NEWS_CREATE", `Creating news successful.`);
			return cb({ 'status': 'success', 'message': 'Successfully created News' });
		});
	}),

	/**
	 * Gets the latest news item
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	newest: (session, cb) => {
		async.waterfall([
			(next) => {
				db.models.news.findOne({}).sort({ createdAt: 'desc' }).exec(next);
			}
		], async (err, news) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("NEWS_NEWEST", `Getting the latest news failed. "${err}"`);
				return cb({ 'status': 'failure', 'message': err });
			}
			logger.success("NEWS_NEWEST", `Successfully got the latest news.`, false);
			return cb({ status: 'success', data: news });
		});
	},

	/**
	 * Removes a news item
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {Object} news - the news object
	 * @param {Function} cb - gets called with the result
	 */
	//TODO Pass in an id, not an object
	//TODO Fix this
	remove: hooks.adminRequired((session, news, cb) => {
		db.models.news.deleteOne({ _id: news._id }, async err => {
			if (err) {
				err = await utils.getError(err);
				logger.error("NEWS_REMOVE", `Removing news "${news._id}" failed for user "${session.userId}". "${err}"`);
				return cb({ 'status': 'failure', 'message': err });
			} else {
				cache.pub('news.remove', news);
				logger.success("NEWS_REMOVE", `Removing news "${news._id}" successful by user "${session.userId}".`);
				return cb({ 'status': 'success', 'message': 'Successfully removed News' });
			}
		});
	}),

	/**
	 * Removes a news item
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} _id - the news id
	 * @param {Object} news - the news object
	 * @param {Function} cb - gets called with the result
	 */
	//TODO Fix this
	update: hooks.adminRequired((session, _id, news, cb) => {
		db.models.news.updateOne({ _id }, news, { upsert: true }, async err => {
			if (err) {
				err = await utils.getError(err);
				logger.error("NEWS_UPDATE", `Updating news "${_id}" failed for user "${session.userId}". "${err}"`);
				return cb({ 'status': 'failure', 'message': err });
			} else {
				cache.pub('news.update', news);
				logger.success("NEWS_UPDATE", `Updating news "${_id}" successful for user "${session.userId}".`);
				return cb({ 'status': 'success', 'message': 'Successfully updated News' });
			}
		});
	}),

};