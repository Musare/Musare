'use strict';

const 	request = require('request'),
		config  = require('config'),
		async 	= require('async'),
		utils 	= require('../utils'),
		logger 	= require('../logger'),
		hooks 	= require('./hooks');

module.exports = {

	/**
	 * Fetches a list of songs from Youtubes API
	 *
	 * @param session
	 * @param query - the query we'll pass to youtubes api
	 * @param cb
	 * @return {{ status: String, data: Object }}
	 */
	searchYoutube: (session, query, cb) => {
		const params = [
			'part=snippet',
			`q=${encodeURIComponent(query)}`,
			`key=${config.get('apis.youtube.key')}`,
			'type=video',
			'maxResults=15'
		].join('&');

		async.waterfall([
			(next) => {
				request(`https://www.googleapis.com/youtube/v3/search?${params}`, next);
			},

			(res, body, next) => {
				next(null, JSON.parse(body));
			}
		], (err, data) => {
			if (err) {
				err = utils.getError(err);
				logger.error("APIS_SEARCH_YOUTUBE", `Searching youtube failed with query "${query}". "${err}"`);
				return cb({status: 'failure', message: err});
			}
			logger.success("APIS_SEARCH_YOUTUBE", `Searching YouTube successful with query "${query}".`);
			return cb({ status: 'success', data });
		});
	},

	/**
	 * Joins a room
	 *
	 * @param session
	 * @param page - the room to join
	 * @param cb
	 */
	joinRoom: (session, page, cb) => {
		if (page === 'home') {
			utils.socketJoinRoom(session.socketId, page);
		}
		cb({});
	},

	/**
	 * Joins an admin room
	 *
	 * @param session
	 * @param page - the admin room to join
	 * @param cb
	 */
	joinAdminRoom: hooks.adminRequired((session, page, cb) => {
		if (page === 'queue' || page === 'songs' || page === 'stations' || page === 'reports' || page === 'news' || page === 'users') {
			utils.socketJoinRoom(session.socketId, `admin.${page}`);
		}
		cb({});
	}),

	/**
	 * Returns current date
	 *
	 * @param session
	 * @param cb
	 */
	ping: (session, cb) => {
		cb({date: Date.now()});
	}

};
