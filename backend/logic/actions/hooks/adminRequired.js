const async = require('async');

const moduleManager = require("../../../index");

const db = moduleManager.modules["db"];
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
				db.models.user.findOne({_id: session.userId}, next);
			},
			(user, next) => {
				if (!user) return next('Login required.');
				if (user.role !== 'admin') return next('Insufficient permissions.');
				next();
			}
		], async (err) => {
			if (err) {
				err = await utils.getError(err);
				logger.info("ADMIN_REQUIRED", `User failed to pass admin required check. "${err}"`);
				return cb({status: 'failure', message: err});
			}
			logger.info("ADMIN_REQUIRED", `User "${session.userId}" passed admin required check.`, false);
			args.push(session.userId);
			next.apply(null, args);
		});
	}
};