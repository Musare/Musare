const cache = require('../../cache');

module.exports = function(next) {
	return function(session) {
		let args = [];
		for (let prop in arguments) args.push(arguments[prop]);
		let cb = args[args.length - 1];
		cache.hget('sessions', session.sessionId, (err, session) => {
			if (err || !session || !session.userId) return cb({ status: 'failure', message: 'Login required.' });
			args.push(session.userId);
			next.apply(null, args);
		});
	}
};