import async from "async";
import mongoose from "mongoose";
import CoreClass from "../core";

let PunishmentsModule;
let CacheModule;
let DBModule;
let UtilsModule;

class _PunishmentsModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("punishments");

		PunishmentsModule = this;
	}

	/**
	 * Initialises the punishments module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		this.setStage(1);

		CacheModule = this.moduleManager.modules.cache;
		DBModule = this.moduleManager.modules.db;
		UtilsModule = this.moduleManager.modules.utils;

		this.punishmentModel = await DBModule.runJob("GET_MODEL", { modelName: "punishment" });
		this.punishmentSchemaCache = await DBModule.runJob("GET_SCHEMA", { schemaName: "punishment" });

		return new Promise((resolve, reject) =>
			async.waterfall(
				[
					next => {
						this.setStage(2);
						CacheModule.runJob("HGETALL", { table: "punishments" })
							.then(punishments => {
								next(null, punishments);
							})
							.catch(next);
					},

					(punishments, next) => {
						this.setStage(3);

						if (!punishments) return next();

						const punishmentIds = Object.keys(punishments);

						return async.each(
							punishmentIds,
							(punishmentId, cb) => {
								PunishmentsModule.punishmentModel.findOne({ _id: punishmentId }, (err, punishment) => {
									if (err) next(err);
									else if (!punishment)
										CacheModule.runJob("HDEL", {
											table: "punishments",
											key: punishmentId
										})
											.then(() => {
												cb();
											})
											.catch(next);
									else cb();
								});
							},
							next
						);
					},

					next => {
						this.setStage(4);
						PunishmentsModule.punishmentModel.find({}, next);
					},

					(punishments, next) => {
						this.setStage(5);
						async.each(
							punishments,
							(punishment, next) => {
								if (punishment.active === false || punishment.expiresAt < Date.now()) return next();

								return CacheModule.runJob("HSET", {
									table: "punishments",
									key: punishment._id,
									value: PunishmentsModule.punishmentSchemaCache(punishment, punishment._id)
								})
									.then(() => next())
									.catch(next);
							},
							next
						);
					}
				],
				async err => {
					if (err) {
						const formattedErr = await UtilsModule.runJob("GET_ERROR", { error: err });
						reject(new Error(formattedErr));
					} else resolve();
				}
			)
		);
	}

	/**
	 * Gets all punishments in the cache that are active, and removes those that have expired
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_PUNISHMENTS() {
		return new Promise((resolve, reject) => {
			const punishmentsToRemove = [];
			async.waterfall(
				[
					next => {
						CacheModule.runJob("HGETALL", { table: "punishments" }, this)
							.then(punishmentsObj => next(null, punishmentsObj))
							.catch(next);
					},

					(punishments, next) => {
						let filteredPunishments = [];

						for (
							let id = 0, punishmentKeys = Object.keys(punishments);
							id < punishmentKeys.length;
							id += 1
						) {
							const punishment = punishments[id];
							punishment.punishmentId = id;
							punishments.push(punishment);
						}

						filteredPunishments = punishments.filter(punishment => {
							if (punishment.expiresAt < Date.now()) punishmentsToRemove.push(punishment);
							return punishment.expiresAt > Date.now();
						});

						next(null, filteredPunishments);
					},

					(punishments, next) => {
						async.each(
							punishmentsToRemove,
							(punishment, next2) => {
								CacheModule.runJob(
									"HDEL",
									{
										table: "punishments",
										key: punishment.punishmentId
									},
									this
								).finally(() => next2());
							},
							() => {
								next(null, punishments);
							}
						);
					}
				],
				(err, punishments) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve(punishments);
				}
			);
		});
	}

	/**
	 * Gets a punishment by id
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.id - the id of the punishment we are trying to get
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_PUNISHMENT(payload) {
		return new Promise((resolve, reject) =>
			async.waterfall(
				[
					next => {
						if (!mongoose.Types.ObjectId.isValid(payload.id)) return next("Id is not a valid ObjectId.");
						return CacheModule.runJob(
							"HGET",
							{
								table: "punishments",
								key: payload.id
							},
							this
						)
							.then(punishment => next(null, punishment))
							.catch(next);
					},

					(punishment, next) => {
						if (punishment) return next(true, punishment);
						return PunishmentsModule.punishmentModel.findOne({ _id: payload.id }, next);
					},

					(punishment, next) => {
						if (punishment) {
							CacheModule.runJob(
								"HSET",
								{
									table: "punishments",
									key: payload.id,
									value: punishment
								},
								this
							)
								.then(punishment => {
									next(null, punishment);
								})
								.catch(next);
						} else next("Punishment not found.");
					}
				],
				(err, punishment) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve(punishment);
				}
			)
		);
	}

	/**
	 * Gets all punishments from a userId
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.userId - the userId of the punishment(s) we are trying to get
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_PUNISHMENTS_FROM_USER_ID(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						PunishmentsModule.runJob("GET_PUNISHMENTS", {}, this)
							.then(punishments => {
								next(null, punishments);
							})
							.catch(next);
					},
					(punishments, next) => {
						const filteredPunishments = punishments.filter(
							punishment => punishment.type === "banUserId" && punishment.value === payload.userId
						);
						next(null, filteredPunishments);
					}
				],
				(err, punishments) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve(punishments);
				}
			);
		});
	}

	/**
	 * Adds a new punishment to the database
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.reason - the reason for the punishment e.g. spam
	 * @param {string} payload.type - the type of punishment (enum: ["banUserId", "banUserIp"])
	 * @param {string} payload.value - the user id/ip address for the ban (depends on punishment type)
	 * @param {Date} payload.expiresAt - the date at which the punishment expires at
	 * @param {string} payload.punishedBy - the userId of the who initiated the punishment
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	ADD_PUNISHMENT(payload) {
		return new Promise((resolve, reject) =>
			async.waterfall(
				[
					next => {
						const punishment = new PunishmentsModule.punishmentModel({
							type: payload.type,
							value: payload.value,
							reason: payload.reason,
							active: true,
							expiresAt: payload.expiresAt,
							punishedAt: Date.now(),
							punishedBy: payload.punishedBy
						});
						punishment.save((err, punishment) => {
							if (err) return next(err);
							return next(null, punishment);
						});
					},

					(punishment, next) => {
						CacheModule.runJob(
							"HSET",
							{
								table: "punishments",
								key: punishment._id,
								value: PunishmentsModule.punishmentSchemaCache(punishment, punishment._id)
							},
							this
						)
							.then(() => next())
							.catch(next);
					},

					(punishment, next) => {
						// DISCORD MESSAGE
						next(null, punishment);
					}
				],
				(err, punishment) => {
					if (err) return reject(new Error(err));
					return resolve(punishment);
				}
			)
		);
	}
}

export default new _PunishmentsModule();
