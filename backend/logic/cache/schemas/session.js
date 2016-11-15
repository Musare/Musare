'use strict';

/**
 * Schema for a session stored in redis,
 * gets created when a user logs in
 *
 * @returns {{stationId: null, created: number}}
 */
module.exports = () => {
	return {
		stationId: null,
		created: Date.now()
	};
};
