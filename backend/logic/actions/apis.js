'use strict';

const request = require('request'),
	  config  = require('config'),
		utils = require('../utils'),
		hooks = require('./hooks');

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

		request(`https://www.googleapis.com/youtube/v3/search?${params}`, (err, res, body) => {

			if (err) {
				console.error(err);
				return cb({ status: 'error', message: 'Failed to search youtube with the requested query' });
			}

			cb({ status: 'success', data: JSON.parse(body) });
		});
	},

	joinRoom: (session, page, cb) => {
		if (page === 'home') {
			utils.socketJoinRoom(session.socketId, page);
		}
		cb({});
	},

	joinAdminRoom: hooks.adminRequired((session, page, cb) => {
		if (page === 'queue' || page === 'songs' || page === 'stations' || page === 'reports' || page === 'news' || page === 'users') {
			utils.socketJoinRoom(session.socketId, `admin.${page}`);
		}
		cb({});
	}),

	ping: (session, cb) => {
		cb({date: Date.now()});
	}

};
