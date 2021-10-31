const async = require('async');

const moduleManager = require("../../../index");

const db = moduleManager.modules["db"];
const cache = moduleManager.modules["cache"];
const utils = moduleManager.modules["utils"];
const logger = moduleManager.modules["logger"];
const stations = moduleManager.modules["stations"];

module.exports = function(next) {
	return function(session, stationId) {
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
				if (user.role === 'admin') return next(true);
				stations.getStation(stationId, next);
			},
			(station, next) => {
				if (!station) return next('Station not found.');
				if (station.type === 'community' && station.owner === session.userId) return next(true);
				next('Invalid permissions.');
			}
		], async (err) => {
			if (err !== true) {
				err = await utils.getError(err);
				logger.info("OWNER_REQUIRED", `User failed to pass owner required check for station "${stationId}". "${err}"`);
				return cb({status: 'failure', message: err});
			}
			logger.info("OWNER_REQUIRED", `User "${session.userId}" passed owner required check for station "${stationId}"`, false);
			next.apply(null, args);
		});
	}
};