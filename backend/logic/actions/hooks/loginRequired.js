const async = require('async');

const moduleManager = require("../../../index");

const cache = moduleManager.modules["cache"];
const utils = moduleManager.modules["utils"];
const logger = moduleManager.modules["logger"];

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
		], async (err) => {
			if (err) {
				err = await utils.getError(err);
				logger.info("LOGIN_REQUIRED", `User failed to pass login required check.`);
				return cb({status: 'failure', message: err});
			}
			logger.info("LOGIN_REQUIRED", `User "${session.userId}" passed login required check.`, false);
			next.apply(null, args);
		});
	}
};