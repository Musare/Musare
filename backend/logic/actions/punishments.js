import async from "async";

import { useHasPermission } from "../hooks/hasPermission";

// eslint-disable-next-line
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
				socket.close();
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
	getData: useHasPermission(
		"punishments.getData",
		async function getSet(session, page, pageSize, properties, sort, queries, operator, cb) {
			async.waterfall(
				[
					next => {
						DBModule.runJob(
							"GET_DATA",
							{
								page,
								pageSize,
								properties,
								sort,
								queries,
								operator,
								modelName: "punishment",
								blacklistedProperties: [],
								specialProperties: {
									status: [
										{
											$addFields: {
												status: {
													$cond: [
														{ $eq: ["$active", true] },
														{
															$cond: [
																{ $gt: [new Date(), "$expiresAt"] },
																"Inactive",
																"Active"
															]
														},
														"Inactive"
													]
												}
											}
										}
									],
									value: [
										{
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
										},
										{
											$lookup: {
												from: "users",
												localField: "valueOID",
												foreignField: "_id",
												as: "valueUser"
											}
										},
										{
											$unwind: {
												path: "$valueUser",
												preserveNullAndEmptyArrays: true
											}
										},
										{
											$addFields: {
												valueUsername: {
													$cond: [
														{ $eq: ["$type", "banUserId"] },
														{ $ifNull: ["$valueUser.username", "unknown"] },
														null
													]
												}
											}
										},
										{
											$project: {
												valueOID: 0,
												valueUser: 0
											}
										}
									],
									punishedBy: [
										{
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
										},
										{
											$lookup: {
												from: "users",
												localField: "punishedByOID",
												foreignField: "_id",
												as: "punishedByUser"
											}
										},
										{
											$unwind: {
												path: "$punishedByUser",
												preserveNullAndEmptyArrays: true
											}
										},
										{
											$addFields: {
												punishedByUsername: {
													$ifNull: ["$punishedByUser.username", "unknown"]
												}
											}
										},
										{
											$project: {
												punishedByOID: 0,
												punishedByUser: 0
											}
										}
									]
								},
								specialQueries: {
									value: newQuery => ({ $or: [newQuery, { valueUsername: newQuery.value }] }),
									punishedBy: newQuery => ({
										$or: [newQuery, { punishedByUsername: newQuery.punishedBy }]
									})
								}
							},
							this
						)
							.then(response => {
								next(null, response);
							})
							.catch(err => {
								next(err);
							});
					}
				],
				async (err, response) => {
					if (err && err !== true) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						this.log("ERROR", "PUNISHMENTS_GET_DATA", `Failed to get data from punishments. "${err}"`);
						return cb({ status: "error", message: err });
					}
					this.log("SUCCESS", "PUNISHMENTS_GET_DATA", `Got data from punishments successfully.`);
					return cb({
						status: "success",
						message: "Successfully got data from punishments.",
						data: response
					});
				}
			);
		}
	),

	/**
	 * Gets all punishments for a user
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} userId - the id of the user
	 * @param {Function} cb - gets called with the result
	 */
	getPunishmentsForUser: useHasPermission(
		"punishments.getPunishmentsForUser",
		async function getPunishmentsForUser(session, userId, cb) {
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
		}
	),

	/**
	 * Returns a punishment by id
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} punishmentId - the punishment id
	 * @param {Function} cb - gets called with the result
	 */
	findOne: useHasPermission("punishments.findOne", async function findOne(session, punishmentId, cb) {
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
	banIP: useHasPermission("punishments.banIP", function banIP(session, value, reason, expiresAt, cb) {
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
