import async from "async";
import mongoose from "mongoose";
import CoreClass from "../core";

class PunishmentsModule extends CoreClass {
	constructor() {
		super("punishments");
	}

	async initialize() {
		this.setStage(1);

		this.cache = this.moduleManager.modules.cache;
		this.db = this.moduleManager.modules.db;
		this.io = this.moduleManager.modules.io;
		this.utils = this.moduleManager.modules.utils;

		const punishmentModel = await this.db.runJob("GET_MODEL", { modelName: "punishment" });
		const punishmentSchema = await this.db.runJob("GET_SCHEMA", { schemaName: "punishment" });

		return new Promise((resolve, reject) =>
			async.waterfall(
				[
					next => {
						this.setStage(2);
						this.cache
							.runJob("HGETALL", { table: "punishments" })
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
								punishmentModel.findOne({ _id: punishmentId }, (err, punishment) => {
									if (err) next(err);
									else if (!punishment)
										this.cache
											.runJob("HDEL", {
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
						punishmentModel.find({}, next);
					},

					(punishments, next) => {
						this.setStage(5);
						async.each(
							punishments,
							(punishment, next) => {
								if (punishment.active === false || punishment.expiresAt < Date.now()) return next();

								return this.cache
									.runJob("HSET", {
										table: "punishments",
										key: punishment._id,
										value: punishmentSchema(punishment, punishment._id)
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
						const formattedErr = await this.utils.runJob("GET_ERROR", { error: err });
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
						this.cache
							.runJob("HGETALL", { table: "punishments" })
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
								this.cache
									.runJob("HDEL", {
										table: "punishments",
										key: punishment.punishmentId
									})
									.finally(() => next2());
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
		// id, cb
		return new Promise((resolve, reject) => {
			let punishmentModel;

			this.db
				.runJob("GET_MODEL", { modelName: "punishment" })
				.then(model => {
					punishmentModel = model;
				})
				.catch(console.error);

			return async.waterfall(
				[
					next => {
						if (!mongoose.Types.ObjectId.isValid(payload.id)) return next("Id is not a valid ObjectId.");
						return this.cache
							.runJob("HGET", {
								table: "punishments",
								key: payload.id
							})
							.then(punishment => next(null, punishment))
							.catch(next);
					},

					(punishment, next) => {
						if (punishment) return next(true, punishment);
						return punishmentModel.findOne({ _id: payload.id }, next);
					},

					(punishment, next) => {
						if (punishment) {
							this.cache
								.runJob("HSET", {
									table: "punishments",
									key: payload.id,
									value: punishment
								})
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
			);
		});
	}

	/**
	 * Gets all punishments from a userId
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.userId - the userId of the punishment(s) we are trying to get
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_PUNISHMENTS_FROM_USER_ID(payload) {
		// userId, cb
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						this.runJob("GET_PUNISHMENTS", {})
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
	 * Gets all punishments from a userId
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.userId - the userId of the punishment(s) we are trying to get
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	ADD_PUNISHMENT(payload) {
		// type, value, reason, expiresAt, punishedBy, cb
		return new Promise((resolve, reject) => {
			let PunishmentModel;
			let PunishmentSchema;

			this.db
				.runJob("GET_MODEL", { modelName: "punishment" })
				.then(model => {
					PunishmentModel = model;
				})
				.catch(console.error);

			this.db
				.runJob("GET_SCHEMA", { schemaName: "punishment" })
				.then(model => {
					PunishmentSchema = model;
				})
				.catch(console.error);

			return async.waterfall(
				[
					next => {
						const punishment = new PunishmentModel({
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
						this.cache
							.runJob("HSET", {
								table: "punishments",
								key: punishment._id,
								value: PunishmentSchema(punishment, punishment._id)
							})
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
			);
		});
	}
}

export default new PunishmentsModule();
