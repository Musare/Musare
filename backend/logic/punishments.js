'use strict';

const cache = require('./cache');
const db = require('./db');
const io = require('./io');
const utils = require('./utils');
const async = require('async');
const mongoose = require('mongoose');

let initialized = false;
let lockdown = false;

module.exports = {

	/**
	 * Initializes the punishments module, and exits if it is unsuccessful
	 *
	 * @param {Function} cb - gets called once we're done initializing
	 */
	init: cb => {
		async.waterfall([
			(next) => {
				cache.hgetall('punishments', next);
			},

			(punishments, next) => {
				if (!punishments) return next();
				let punishmentIds = Object.keys(punishments);
				async.each(punishmentIds, (punishmentId, next) => {
					db.models.punishment.findOne({_id: punishmentId}, (err, punishment) => {
						if (err) next(err);
						else if (!punishment) cache.hdel('punishments', punishmentId, next);
						else next();
					});
				}, next);
			},

			(next) => {
				db.models.punishment.find({}, next);
			},

			(punishments, next) => {
				async.each(punishments, (punishment, next) => {
					if (punishment.active === false || punishment.expiresAt < Date.now()) return next();
					cache.hset('punishments', punishment._id, cache.schemas.punishment(punishment), next);
				}, next);
			}
		], (err) => {
			if (lockdown) return this._lockdown();
			if (err) {
				err = utils.getError(err);
				cb(err);
			} else {
				initialized = true;
				cb();
			}
		});
	},

	/**
	 * Gets all punishments in the cache that are active, and removes those that have expired
	 *
	 * @param {Function} cb - gets called once we're done initializing
	 */
	getPunishments: function(cb) {
		if (lockdown) return cb('Lockdown');
		let punishmentsToRemove = [];
		async.waterfall([
			(next) => {
				cache.hgetall('punishments', next);
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
						cache.hdel('punishments', punishment.punishmentId, () => {
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
	},

	/**
	 * Gets a punishment by id
	 *
	 * @param {String} id - the id of the punishment we are trying to get
	 * @param {Function} cb - gets called once we're done initializing
	 */
	getPunishment: function(id, cb) {
		if (lockdown) return cb('Lockdown');
		async.waterfall([

			(next) => {
				if (!mongoose.Types.ObjectId.isValid(id)) return next('Id is not a valid ObjectId.');
				cache.hget('punishments', id, next);
			},

			(punishment, next) => {
				if (punishment) return next(true, punishment);
				db.models.punishment.findOne({_id: id}, next);
			},

			(punishment, next) => {
				if (punishment) {
					cache.hset('punishments', id, punishment, next);
				} else next('Punishment not found.');
			},

		], (err, punishment) => {
			if (err && err !== true) return cb(err);

			cb(null, punishment);
		});
	},

	/**
	 * Gets all punishments from a userId
	 *
	 * @param {String} userId - the userId of the punishment(s) we are trying to get
	 * @param {Function} cb - gets called once we're done initializing
	 */
	getPunishmentsFromUserId: function(userId, cb) {
		if (lockdown) return cb('Lockdown');
		async.waterfall([
			(next) => {
				module.exports.getPunishments(next);
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
	},

	addPunishment: function(type, value, reason, expiresAt, punishedBy, cb) {
		if (lockdown) return cb('Lockdown');
		async.waterfall([
			(next) => {
				const punishment = new db.models.punishment({
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
				cache.hset('punishments', punishment._id, { type, value, reason, expiresAt }, next);
			},

			(punishment, next) => {
				// DISCORD MESSAGE
				next();
			}
		], (err) => {
			cb(err);
		});
	},

	removePunishmentFromCache: function(punishmentId, cb) {
		if (lockdown) return cb('Lockdown');
		async.waterfall([
			(next) => {
				const punishment = new db.models.punishment({
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
				cache.hset('punishments', punishment._id, punishment, next);
			},

			(punishment, next) => {
				// DISCORD MESSAGE
				next();
			}
		], (err) => {
			cb(err);
		});
	},

	_lockdown: () => {
		lockdown = true;
	}
};
