import async from "async";

import moduleManager from "../../../index";

const DBModule = moduleManager.modules.db;
const CacheModule = moduleManager.modules.cache;
const UtilsModule = moduleManager.modules.utils;
const StationsModule = moduleManager.modules.stations;

export default destination => async (session, stationId, ...args) => {
	const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" });

	const cb = args[args.length - 1];

	async.waterfall(
		[
			next => {
				CacheModule.runJob("HGET", {
					table: "sessions",
					key: session.sessionId
				})
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
				if (user.role === "admin") return next(true);
				return StationsModule.runJob("GET_STATION", { stationId })
					.then(station => {
						next(null, station);
					})
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
				err = await UtilsModule.runJob("GET_ERROR", { error: err });
				console.log(
					"INFO",
					"OWNER_REQUIRED",
					`User failed to pass owner required check for station "${stationId}". "${err}"`
				);
				return cb({ status: "failure", message: err });
			}
			console.log(
				"INFO",
				"OWNER_REQUIRED",
				`User "${session.userId}" passed owner required check for station "${stationId}"`,
				false
			);

			return destination(session, stationId, ...args);
		}
	);
};
