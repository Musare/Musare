'use strict';

/**
 * Schema for a station stored / cached in redis,
 * gets created when a station is in use
 * and therefore is put into the redis cache
 *
 * @param station
 * @returns {Object}
 */
module.exports = (station) => {
	// this is just the data from the DB for now, which we're just caching in memory for fast access
	return station;
};
