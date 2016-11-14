'use strict';

const request = require('request');

module.exports = {

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
	}

};
