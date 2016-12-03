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
	return station;
};
