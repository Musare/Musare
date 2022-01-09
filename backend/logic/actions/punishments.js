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
				// Creates pipeline array
				next => next(null, []),

				// If a filter or property exists for status, add status property to all documents
				(pipeline, next) => {
					// Check if a filter with the status property exists
					const statusFilterExists = queries.map(query => query.filter.property).indexOf("status") !== -1;
					// Check if a property with the status property exists
					const statusPropertyExists = properties.indexOf("status") !== -1;
					// If no such filter or property exists, skip this function
					if (!statusFilterExists && !statusPropertyExists) return next(null, pipeline);

					// Adds status field, set to Inactive if active is false, otherwise it sets it to Inactive if expiresAt has already passed, Active if not
					pipeline.push({
						$addFields: {
							status: {
								$cond: [
									{ $eq: ["$active", true] },
									{ $cond: [{ $gt: [new Date(), "$expiresAt"] }, "Inactive", "Active"] },
									"Inactive"
								]
							}
						}
					});

					return next(null, pipeline);
				},

				// If a filter exists for value, add valueUsername property to all documents
				(pipeline, next) => {
					// Check if a filter with the value property exists
					const valueFilterExists = queries.map(query => query.filter.property).indexOf("value") !== -1;
					// If no such filter exists, skip this function
					if (!valueFilterExists) return next(null, pipeline);

					// Adds valueOID field, which is an ObjectId version of value
					pipeline.push({
						$addFields: {
							valueOID: {
								$convert: {
									input: "$value",
									to: "objectId",
									onError: "unknown",
									onNull: "unknown"
								}
							}
						}
					});

					// Looks up user(s) with the same _id as the valueOID and puts the result in the valueUser field
					pipeline.push({
						$lookup: {
							from: "users",
							localField: "valueOID",
							foreignField: "_id",
							as: "valueUser"
						}
					});

					// Unwinds the valueUser array field into an object
					pipeline.push({
						$unwind: {
							path: "$valueUser",
							preserveNullAndEmptyArrays: true
						}
					});

					// Adds valueUsername field from the valueUser username, or unknown if it doesn't exist, or Musare if it's set to Musare
					pipeline.push({
						$addFields: {
							valueUsername: {
								$cond: [
									{ $eq: ["$type", "banUserId"] },
									{ $ifNull: ["$valueUser.username", "unknown"] },
									null
								]
							}
						}
					});

					// Removes the valueOID and valueUser property, just in case it doesn't get removed at a later stage
					pipeline.push({
						$project: {
							valueOID: 0,
							valueUser: 0
						}
					});

					return next(null, pipeline);
				},

				// If a filter exists for punishedBy, add punishedByUsername property to all documents
				(pipeline, next) => {
					// Check if a filter with the punishedBy property exists
					const punishedByFilterExists =
						queries.map(query => query.filter.property).indexOf("punishedBy") !== -1;
					// If no such filter exists, skip this function
					if (!punishedByFilterExists) return next(null, pipeline);

					// Adds punishedByOID field, which is an ObjectId version of punishedBy
					pipeline.push({
						$addFields: {
							punishedByOID: {
								$convert: {
									input: "$punishedBy",
									to: "objectId",
									onError: "unknown",
									onNull: "unknown"
								}
							}
						}
					});

					// Looks up user(s) with the same _id as the punishedByOID and puts the result in the punishedByUser field
					pipeline.push({
						$lookup: {
							from: "users",
							localField: "punishedByOID",
							foreignField: "_id",
							as: "punishedByUser"
						}
					});

					// Unwinds the punishedByUser array field into an object
					pipeline.push({
						$unwind: {
							path: "$punishedByUser",
							preserveNullAndEmptyArrays: true
						}
					});

					// Adds punishedByUsername field from the punishedByUser username, or unknown if it doesn't exist
					pipeline.push({
						$addFields: {
							punishedByUsername: {
								$ifNull: ["$punishedByUser.username", "unknown"]
							}
						}
					});

					// Removes the punishedByOID and punishedByUser property, just in case it doesn't get removed at a later stage
					pipeline.push({
						$project: {
							punishedByOID: 0,
							punishedByUser: 0
						}
					});

					return next(null, pipeline);
				},

				// Adds the match stage to aggregation pipeline, which is responsible for filtering
				(pipeline, next) => {
					let queryError;
					const newQueries = queries.flatMap(query => {
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
							newQuery[filter.property] = { $lte: Number(data) };
						} else if (filterType === "numberLesser") {
							newQuery[filter.property] = { $lt: Number(data) };
						} else if (filterType === "numberGreater") {
							newQuery[filter.property] = { $gt: Number(data) };
						} else if (filterType === "numberGreaterEqual") {
							newQuery[filter.property] = { $gte: Number(data) };
						} else if (filterType === "numberEquals") {
							newQuery[filter.property] = { $eq: Number(data) };
						} else if (filterType === "boolean") {
							newQuery[filter.property] = { $eq: !!data };
						}

						if (filter.property === "value") return { $or: [newQuery, { valueUsername: newQuery.value }] };
						if (filter.property === "punishedBy")
							return { $or: [newQuery, { punishedByUsername: newQuery.punishedBy }] };

						return newQuery;
					});
					if (queryError) next(queryError);

					const queryObject = {};
					if (newQueries.length > 0) {
						if (operator === "and") queryObject.$and = newQueries;
						else if (operator === "or") queryObject.$or = newQueries;
						else if (operator === "nor") queryObject.$nor = newQueries;
					}

					pipeline.push({ $match: queryObject });

					next(null, pipeline);
				},

				// Adds sort stage to aggregation pipeline if there is at least one column being sorted, responsible for sorting data
				(pipeline, next) => {
					const newSort = Object.fromEntries(
						Object.entries(sort).map(([property, direction]) => [
							property,
							direction === "ascending" ? 1 : -1
						])
					);
					if (Object.keys(newSort).length > 0) pipeline.push({ $sort: newSort });
					next(null, pipeline);
				},

				// Adds first project stage to aggregation pipeline, responsible for including only the requested properties
				(pipeline, next) => {
					pipeline.push({ $project: Object.fromEntries(properties.map(property => [property, 1])) });

					next(null, pipeline);
				},

				// Adds the facet stage to aggregation pipeline, responsible for returning a total document count, skipping and limitting the documents that will be returned
				(pipeline, next) => {
					pipeline.push({
						$facet: {
							count: [{ $count: "count" }],
							documents: [{ $skip: pageSize * (page - 1) }, { $limit: pageSize }]
						}
					});

					// console.dir(pipeline, { depth: 6 });

					next(null, pipeline);
				},

				// Executes the aggregation pipeline
				(pipeline, next) => {
					punishmentModel.aggregate(pipeline).exec((err, result) => {
						// console.dir(err);
						// console.dir(result, { depth: 6 });
						if (err) return next(err);
						if (result[0].count.length === 0) return next(null, 0, []);
						const { count } = result[0].count[0];
						const { documents } = result[0];
						// console.log(111, err, result, count, documents[0]);
						return next(null, count, documents);
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
