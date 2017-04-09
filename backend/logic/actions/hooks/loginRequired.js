const cache = require('../../cache');
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
				next();
			}
		], (err) => {
			if (err) {
				err = utils.getError(err);
				logger.info("LOGIN_REQUIRED", `User failed to pass login required check.`);
				return cb({status: 'failure', message: err});
			}
			logger.info("LOGIN_REQUIRED", `User "${session.userId}" passed login required check.`, false);
			args.push(session.userId);
			next.apply(null, args);
		});
	}
};