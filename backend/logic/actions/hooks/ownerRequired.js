import async from "async";

// eslint-disable-next-line
import moduleManager from "../../../index";

const DBModule = moduleManager.modules.db;
const CacheModule = moduleManager.modules.cache;
const UtilsModule = moduleManager.modules.utils;
const StationsModule = moduleManager.modules.stations;

export default destination =>
	async function ownerRequired(session, stationId, ...args) {
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
						.then(session => next(null, session))
						.catch(next);
				},
				(session, next) => {
					if (!session || !session.userId) return next("Login required.");
					return userModel.findOne({ _id: session.userId }, next);
				},
				(user, next) => {
					if (!user) return next("Login required.");
					if (user.role === "admin") return next(true);

					if (!stationId) return next("Please provide a stationId.");

					return StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				},
				(station, next) => {
					if (!station) return next("Station not found.");
					if (station.type === "community" && station.owner === session.userId) return next(true);
					return next("Invalid permissions.");
				}
			],
			async err => {
				if (err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"INFO",
						"OWNER_REQUIRED",
						`User failed to pass owner required check for station "${stationId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}
				this.log(
					"INFO",
					"OWNER_REQUIRED",
					`User "${session.userId}" passed owner required check for station "${stationId}"`,
					false
				);

				return destination.apply(this, [session, stationId].concat(args));
			}
		);
	};
