'use strict';

const 	hooks 	= require('./hooks'),
	 	async 	= require('async'),
	 	logger 	= require('../logger'),
	 	utils 	= require('../utils'),
	 	db 	= require('../db');

module.exports = {

	/**
	 * Gets all punishments
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	index: hooks.adminRequired((session, cb) => {
		async.waterfall([
			(next) => {
				db.models.punishment.find({}, next);
			}
		], (err, punishments) => {
			if (err) {
				err = utils.getError(err);
				logger.error("PUNISHMENTS_INDEX", `Indexing punishments failed. "${err}"`);
				return cb({ 'status': 'failure', 'message': err});
			}
			logger.success("PUNISHMENTS_INDEX", "Indexing punishments successful.");
			cb({ status: 'success', data: punishments });
		});
	}),

};
