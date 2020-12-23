import async from "async";

import db from "../../db";
import cache from "../../cache";
import utils from "../../utils";
import stations from "../../stations";

export default destination => async (session, stationId, ...args) => {
	const userModel = await db.runJob("GET_MODEL", { modelName: "user" });

	const cb = args[args.length - 1];

	async.waterfall(
		[
			next => {
				cache
					.runJob("HGET", {
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
				return stations
					.runJob("GET_STATION", { stationId })
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
				err = await utils.runJob("GET_ERROR", { error: err });
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
