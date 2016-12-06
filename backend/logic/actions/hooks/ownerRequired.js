const cache = require('../../cache');
const db = require('../../db');
const stations = require('../../stations');

module.exports = function(next) {
	return function(session, stationId) {
		let args = [];
		for (let prop in arguments) args.push(arguments[prop]);
		let cb = args[args.length - 1];
		cache.hget('sessions', session.sessionId, (err, session) => {
			if (err || !session || !session.userId) return cb({ status: 'failure', message: 'Login required.' });
			db.models.user.findOne({_id: session.userId}, (err, user) => {
				if (err || !user) return cb({ status: 'failure', message: 'Login required.' });
				if (user.role === 'admin') func();
				else {
					stations.getStation(stationId, (err, station) => {
						if (err || !station) return cb({ status: 'failure', message: 'Something went wrong when getting the station.' });
						else if (station.type === 'community' && station.owner === session.userId) func();
						else return cb({ status: 'failure', message: 'Invalid permissions.' });
					});
				}

				function func() {
					args.push(session.userId);
					next.apply(null, args);
				}
			});
		});
	}
};