import async from "async";

import moduleManager from "../../../index";

const CacheModule = moduleManager.modules.cache;
const UtilsModule = moduleManager.modules.utils;

export default destination =>
	function loginRequired(session, ...args) {
		const cb = args[args.length - 1];

		async.waterfall(
			[
				next => {
					CacheModule.runJob(
						"HGET",
						{
							table: "sessions",
							key: session.sessionId
						},
						this
					)
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
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("LOGIN_REQUIRED", `User failed to pass login required check.`);
					return cb({ status: "failure", message: err });
				}
				this.log("LOGIN_REQUIRED", `User "${session.userId}" passed login required check.`);
				return destination.apply(this, [session].concat(args));
			}
		);
	};
