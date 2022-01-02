import async from "async";

import { isAdminRequired } from "./hooks";

import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const WSModule = moduleManager.modules.ws;
const CacheModule = moduleManager.modules.cache;
const PunishmentsModule = moduleManager.modules.punishments;

CacheModule.runJob("SUB", {
	channel: "ip.ban",
	cb: data => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.punishments",
			args: ["event:admin.punishment.created", { data: { punishment: data.punishment } }]
		});

		WSModule.runJob("SOCKETS_FROM_IP", { ip: data.ip }, this).then(sockets => {
			sockets.forEach(socket => {
				socket.disconnect(true);
			});
		});
	}
});

export default {
	/**
	 * Gets punishments, used in the admin punishments page by the AdvancedTable component
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param page - the page
	 * @param pageSize - the size per page
	 * @param properties - the properties to return for each punishment
	 * @param sort - the sort object
	 * @param queries - the queries array
	 * @param operator - the operator for queries
	 * @param cb
	 */
	getData: isAdminRequired(async function getSet(session, page, pageSize, properties, sort, queries, operator, cb) {
		const punishmentModel = await DBModule.runJob("GET_MODEL", { modelName: "punishment" }, this);

		async.waterfall(
			[
				next => {
					const newQueries = queries.map(query => {
						const { data, filter, filterType } = query;
						const newQuery = {};
						if (filterType === "regex") {
							newQuery[filter.property] = new RegExp(`${data.slice(1, data.length - 1)}`, "i");
						} else if (filterType === "contains") {
							newQuery[filter.property] = new RegExp(
								`${data.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
								"i"
							);
						} else if (filterType === "exact") {
							newQuery[filter.property] = data.toString();
						} else if (filterType === "datetimeBefore") {
							newQuery[filter.property] = { $lte: new Date(data) };
						} else if (filterType === "datetimeAfter") {
							newQuery[filter.property] = { $gte: new Date(data) };
						} else if (filterType === "numberLesserEqual") {
							newQuery[filter.property] = { $lte: data };
						} else if (filterType === "numberLesser") {
							newQuery[filter.property] = { $lt: data };
						} else if (filterType === "numberGreater") {
							newQuery[filter.property] = { $gt: data };
						} else if (filterType === "numberGreaterEqual") {
							newQuery[filter.property] = { $gte: data };
						} else if (filterType === "numberEquals") {
							newQuery[filter.property] = { $eq: data };
						}
						return newQuery;
					});

					const queryObject = {};
					if (newQueries.length > 0) {
						if (operator === "and") queryObject.$and = newQueries;
						else if (operator === "or") queryObject.$or = newQueries;
						else if (operator === "nor") queryObject.$nor = newQueries;
					}

					next(null, queryObject);
				},

				(queryObject, next) => {
					punishmentModel.find(queryObject).count((err, count) => {
						next(err, queryObject, count);
					});
				},

				(queryObject, count, next) => {
					punishmentModel
						.find(queryObject)
						.sort(sort)
						.skip(pageSize * (page - 1))
						.limit(pageSize)
						.select(properties.join(" "))
						.exec((err, punishments) => {
							next(err, count, punishments);
						});
				}
			],
			async (err, count, punishments) => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "PUNISHMENTS_GET_DATA", `Failed to get data from punishments. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "PUNISHMENTS_GET_DATA", `Got data from punishments successfully.`);
				return cb({
					status: "success",
					message: "Successfully got data from punishments.",
					data: { data: punishments, count }
				});
			}
		);
	}),

	/**
	 * Gets all punishments for a user
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} userId - the id of the user
	 * @param {Function} cb - gets called with the result
	 */
	getPunishmentsForUser: isAdminRequired(async function getPunishmentsForUser(session, userId, cb) {
		const punishmentModel = await DBModule.runJob("GET_MODEL", { modelName: "punishment" }, this);

		punishmentModel.find({ type: "banUserId", value: userId }, async (err, punishments) => {
			if (err) {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

				this.log(
					"ERROR",
					"GET_PUNISHMENTS_FOR_USER",
					`Getting punishments for user ${userId} failed. "${err}"`
				);

				return cb({ status: "error", message: err });
			}

			this.log("SUCCESS", "GET_PUNISHMENTS_FOR_USER", `Got punishments for user ${userId} successful.`);
			return cb({ status: "success", data: { punishments } });
		});
	}),

	/**
	 * Returns a punishment by id
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} punishmentId - the punishment id
	 * @param {Function} cb - gets called with the result
	 */
	findOne: isAdminRequired(async function findOne(session, punishmentId, cb) {
		const punishmentModel = await DBModule.runJob("GET_MODEL", { modelName: "punishment" }, this);

		async.waterfall([next => punishmentModel.findOne({ _id: punishmentId }, next)], async (err, punishment) => {
			if (err) {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log(
					"ERROR",
					"GET_PUNISHMENT_BY_ID",
					`Getting punishment with id ${punishmentId} failed. "${err}"`
				);
				return cb({ status: "error", message: err });
			}
			this.log("SUCCESS", "GET_PUNISHMENT_BY_ID", `Got punishment with id ${punishmentId} successful.`);
			return cb({ status: "success", data: { punishment } });
		});
	}),

	/**
	 * Bans an IP address
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} value - the ip address that is going to be banned
	 * @param {string} reason - the reason for the ban
	 * @param {string} expiresAt - the time the ban expires
	 * @param {Function} cb - gets called with the result
	 */
	banIP: isAdminRequired(function banIP(session, value, reason, expiresAt, cb) {
		async.waterfall(
			[
				next => {
					if (!value) return next("You must provide an IP address to ban.");
					if (!reason) return next("You must provide a reason for the ban.");
					return next();
				},

				next => {
					if (!expiresAt || typeof expiresAt !== "string") return next("Invalid expire date.");
					const date = new Date();
					switch (expiresAt) {
						case "1h":
							expiresAt = date.setHours(date.getHours() + 1);
							break;
						case "12h":
							expiresAt = date.setHours(date.getHours() + 12);
							break;
						case "1d":
							expiresAt = date.setDate(date.getDate() + 1);
							break;
						case "1w":
							expiresAt = date.setDate(date.getDate() + 7);
							break;
						case "1m":
							expiresAt = date.setMonth(date.getMonth() + 1);
							break;
						case "3m":
							expiresAt = date.setMonth(date.getMonth() + 3);
							break;
						case "6m":
							expiresAt = date.setMonth(date.getMonth() + 6);
							break;
						case "1y":
							expiresAt = date.setFullYear(date.getFullYear() + 1);
							break;
						case "never":
							expiresAt = new Date(3093527980800000);
							break;
						default:
							return next("Invalid expire date.");
					}

					return next();
				},

				next => {
					PunishmentsModule.runJob(
						"ADD_PUNISHMENT",
						{
							type: "banUserIp",
							value,
							reason,
							expiresAt,
							punishedBy: session.userId
						},
						this
					)
						.then(punishment => {
							next(null, punishment);
						})
						.catch(next);
				}
			],
			async (err, punishment) => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"BAN_IP",
						`User ${session.userId} failed to ban IP address ${value} with the reason ${reason}. '${err}'`
					);
					cb({ status: "error", message: err });
				}
				this.log(
					"SUCCESS",
					"BAN_IP",
					`User ${session.userId} has successfully banned IP address ${value} with the reason ${reason}.`
				);
				CacheModule.runJob("PUB", {
					channel: "ip.ban",
					value: { ip: value, punishment }
				});
				return cb({
					status: "success",
					message: "Successfully banned IP address."
				});
			}
		);
	})
};
