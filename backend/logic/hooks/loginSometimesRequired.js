import async from "async";
import config from "config";

// eslint-disable-next-line
import moduleManager from "../../index";

const CacheModule = moduleManager.modules.cache;
const UtilsModule = moduleManager.modules.utils;

// This is for actions that are only restricted to logged-in users if restrictToUsers config option is true
export default destination =>
	function loginSometimesRequired(session, ...args) {
		const cb = args[args.length - 1];

		async.waterfall(
			[
				next => {
					if (!config.get("restrictToUsers")) next(true);
					else if (!session || !session.sessionId) next("Login required.");
					else next();
				},

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
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("LOGIN_SOMETIMES_REQUIRED", `User failed to pass login required check.`);
					return cb({ status: "error", message: err });
				}
				this.log("LOGIN_SOMETIMES_REQUIRED", `User "${session.userId}" passed login required check.`);
				return destination.apply(this, [session].concat(args));
			}
		);
	};
