const cache = require('../../cache');

module.exports = function(next) {
	return function(sessionId) {
		let args = [];
		for (let prop in arguments) {
			args.push(arguments[prop]);
		}
		let cb = args[args.length - 1];
		cache.hget('sessions', sessionId, (err, session) => {
			if (err || !session || !session.userSessionId) return cb({ status: 'failure', message: 'Login required.' });
			cache.hget('userSessions', session.userSessionId, (err, userSession) => {
				if (err || !userSession || !userSession.userId) return cb({ status: 'failure', message: 'Login required.' });
				args.push(userSession.userId);
				next.apply(null, args);
			});
		});
	}
};