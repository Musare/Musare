import async from "async";

import cache from "../../cache";
import utils from "../../utils";
// const logger = moduleManager.modules["logger"];

export default destination => (session, ...args) => {
	const cb = args[args.length - 1];

	async.waterfall(
		[
			next => {
				cache
					.runJob("HGET", {
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
				err = await utils.runJob("GET_ERROR", { error: err });
				console.log("LOGIN_REQUIRED", `User failed to pass login required check.`);
				return cb({ status: "failure", message: err });
			}
			console.log("LOGIN_REQUIRED", `User "${session.userId}" passed login required check.`);
			return destination(session, ...args);
		}
	);
};
