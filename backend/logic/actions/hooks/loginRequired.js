import async from "async";

import CacheModule from "../../cache";
import UtilsModule from "../../utils";

export default destination => (session, ...args) => {
	const cb = args[args.length - 1];

	async.waterfall(
		[
			next => {
				CacheModule.runJob("HGET", {
					table: "sessions",
					key: session.sessionId
				})
					.then(session => next(null, session))
					.catch(next);
			},
			(session, next) => {
				if (!session || !session.userId) return next("Login required.");
				return next();
			}
		],
		async err => {
			if (err) {
				err = await UtilsModule.runJob("GET_ERROR", { error: err });
				console.log("LOGIN_REQUIRED", `User failed to pass login required check.`);
				return cb({ status: "failure", message: err });
			}
			console.log("LOGIN_REQUIRED", `User "${session.userId}" passed login required check.`);
			return destination(session, ...args);
		}
	);
};
