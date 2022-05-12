import async from "async";

// eslint-disable-next-line
import moduleManager from "../../../index";

const DBModule = moduleManager.modules.db;
const CacheModule = moduleManager.modules.cache;
const UtilsModule = moduleManager.modules.utils;

export default destination =>
	async function adminRequired(session, ...args) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

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
						.then(session => {
							next(null, session);
						})
						.catch(next);
				},
				(session, next) => {
					if (!session || !session.userId) return next("Login required.");
					return userModel.findOne({ _id: session.userId }, next);
				},
				(user, next) => {
					if (!user) return next("Login required.");
					if (user.role !== "admin") return next("Insufficient permissions.");
					return next();
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("INFO", "ADMIN_REQUIRED", `User failed to pass admin required check. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("INFO", "ADMIN_REQUIRED", `User "${session.userId}" passed admin required check.`, false);
				return destination.apply(this, [session].concat(args));
			}
		);
	};
