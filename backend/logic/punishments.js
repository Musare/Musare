'use strict';

const coreClass = require("../core");

const async = require('async');
const mongoose = require('mongoose');

module.exports = class extends coreClass {
	constructor(name, moduleManager) {
		super(name, moduleManager);

		this.dependsOn = ["cache", "db", "utils"];
	}

	initialize() {
		return new Promise((resolve, reject) => {
			this.setStage(1);

			this.cache = this.moduleManager.modules['cache'];
			this.db = this.moduleManager.modules['db'];
			this.io = this.moduleManager.modules['io'];
			this.utils = this.moduleManager.modules['utils'];

			async.waterfall([
				(next) => {
					this.setStage(2);
					this.cache.hgetall('punishments', next);
				},
	
				(punishments, next) => {
					this.setStage(3);
					if (!punishments) return next();
					let punishmentIds = Object.keys(punishments);
					async.each(punishmentIds, (punishmentId, next) => {
						this.db.models.punishment.findOne({_id: punishmentId}, (err, punishment) => {
							if (err) next(err);
							else if (!punishment) this.cache.hdel('punishments', punishmentId, next);
							else next();
						});
					}, next);
				},
	
				(next) => {
					this.setStage(4);
					this.db.models.punishment.find({}, next);
				},
	
				(punishments, next) => {
					this.setStage(5);
					async.each(punishments, (punishment, next) => {
						if (punishment.active === false || punishment.expiresAt < Date.now()) return next();
						this.cache.hset('punishments', punishment._id, this.cache.schemas.punishment(punishment, punishment._id), next);
					}, next);
				}
			], async (err) => {
				if (err) {
					err = await utils.getError(err);
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	/**
	 * Gets all punishments in the cache that are active, and removes those that have expired
	 *
	 * @param {Function} cb - gets called once we're done initializing
	 */
	async getPunishments(cb) {
		try { await this._validateHook(); } catch { return; }

		let punishmentsToRemove = [];
		async.waterfall([
			(next) => {
				this.cache.hgetall('punishments', next);
			},

			(punishmentsObj, next) => {
				let punishments = [];
				for (let id in punishmentsObj) {
					let obj = punishmentsObj[id];
					obj.punishmentId = id;
					punishments.push(obj);
				}
				punishments = punishments.filter(punishment => {
					if (punishment.expiresAt < Date.now()) punishmentsToRemove.push(punishment);
					return punishment.expiresAt > Date.now();
				});
				next(null, punishments);
			},

			(punishments, next) => {
				async.each(
					punishmentsToRemove,
					(punishment, next2) => {
						this.cache.hdel('punishments', punishment.punishmentId, () => {
							next2();
						});
					},
					() => {
						next(null, punishments);
					}
				);
			}
		], (err, punishments) => {
			if (err && err !== true) return cb(err);

			cb(null, punishments);
		});
	}

	/**
	 * Gets a punishment by id
	 *
	 * @param {String} id - the id of the punishment we are trying to get
	 * @param {Function} cb - gets called once we're done initializing
	 */
	async getPunishment(id, cb) {
		try { await this._validateHook(); } catch { return; }

		async.waterfall([

			(next) => {
				if (!mongoose.Types.ObjectId.isValid(id)) return next('Id is not a valid ObjectId.');
				this.cache.hget('punishments', id, next);
			},

			(punishment, next) => {
				if (punishment) return next(true, punishment);
				this.db.models.punishment.findOne({_id: id}, next);
			},

			(punishment, next) => {
				if (punishment) {
					this.cache.hset('punishments', id, punishment, next);
				} else next('Punishment not found.');
			},

		], (err, punishment) => {
			if (err && err !== true) return cb(err);

			cb(null, punishment);
		});
	}

	/**
	 * Gets all punishments from a userId
	 *
	 * @param {String} userId - the userId of the punishment(s) we are trying to get
	 * @param {Function} cb - gets called once we're done initializing
	 */
	async getPunishmentsFromUserId(userId, cb) {
		try { await this._validateHook(); } catch { return; }

		async.waterfall([
			(next) => {
				this.getPunishments(next);
			},
			(punishments, next) => {
				punishments = punishments.filter((punishment) => {
					return punishment.type === 'banUserId' && punishment.value === userId;
				});
				next(null, punishments);
			}
		], (err, punishments) => {
			if (err && err !== true) return cb(err);

			cb(null, punishments);
		});
	}

	async addPunishment(type, value, reason, expiresAt, punishedBy, cb) {
		try { await this._validateHook(); } catch { return; }

		async.waterfall([
			(next) => {
				const punishment = new this.db.models.punishment({
					type,
					value,
					reason,
					active: true,
					expiresAt,
					punishedAt: Date.now(),
					punishedBy
				});
				punishment.save((err, punishment) => {
					if (err) return next(err);
					next(null, punishment);
				});
			},

			(punishment, next) => {
				this.cache.hset('punishments', punishment._id, this.cache.schemas.punishment(punishment, punishment._id), (err) => {
					next(err, punishment);
				});
			},

			(punishment, next) => {
				// DISCORD MESSAGE
				next(null, punishment);
			}
		], (err, punishment) => {
			cb(err, punishment);
		});
	}

	async removePunishmentFromCache(punishmentId, cb) {
		try { await this._validateHook(); } catch { return; }

		async.waterfall([
			(next) => {
				const punishment = new this.db.models.punishment({
					type,
					value,
					reason,
					active: true,
					expiresAt,
					punishedAt: Date.now(),
					punishedBy
				});
				punishment.save((err, punishment) => {
					console.log(err);
					if (err) return next(err);
					next(null, punishment);
				});
			},

			(punishment, next) => {
				this.cache.hset('punishments', punishment._id, punishment, next);
			},

			(punishment, next) => {
				// DISCORD MESSAGE
				next();
			}
		], (err) => {
			cb(err);
		});
	}
}

