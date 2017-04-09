const cache = require('../../cache');
const db = require('../../db');
const utils = require('../../utils');
const logger = require('../../logger');
const async = require('async');

module.exports = function(next) {
	return function(session) {
		let args = [];
		for (let prop in arguments) args.push(arguments[prop]);
		let cb = args[args.length - 1];
		async.waterfall([
			(next) => {
				cache.hget('sessions', session.sessionId, next);
			},
			(session, next) => {
				if (!session || !session.userId) return next('Login required.');
				this.session = session;
				db.models.user.findOne({_id: session.userId}, next);
			},
			(user, next) => {
				if (!user) return next('Login required.');
				if (user.role !== 'admin') return next('Insufficient permissions.');
				next();
			}
		], (err) => {
			if (err) {
				err = utils.getError(err);
				logger.info("ADMIN_REQUIRED", `User failed to pass admin required check. "${err}"`);
				return cb({status: 'failure', message: err});
			}
			logger.info("ADMIN_REQUIRED", `User "${session.userId}" passed admin required check.`, false);
			args.push(session.userId);
			next.apply(null, args);
		});
	}
};