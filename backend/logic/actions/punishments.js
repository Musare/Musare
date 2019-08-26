'use strict';

const async = require('async');

const hooks = require('./hooks');
const moduleManager = require("../../index");

const logger = moduleManager.modules["logger"];
const utils = moduleManager.modules["utils"];
const cache = moduleManager.modules["cache"];
const db = moduleManager.modules["db"];
const punishments = moduleManager.modules["punishments"];

cache.sub('ip.ban', data => {
	utils.emitToRoom('admin.punishments', 'event:admin.punishment.added', data.punishment);
	utils.socketsFromIP(data.ip, sockets => {
		sockets.forEach(socket => {
			socket.disconnect(true);
		});
	});
});

module.exports = {

	/**
	 * Gets all punishments
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	index: hooks.adminRequired((session, cb) => {
		async.waterfall([
			(next) => {
				db.models.punishment.find({}, next);
			}
		], async (err, punishments) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("PUNISHMENTS_INDEX", `Indexing punishments failed. "${err}"`);
				return cb({ 'status': 'failure', 'message': err});
			}
			logger.success("PUNISHMENTS_INDEX", "Indexing punishments successful.");
			cb({ status: 'success', data: punishments });
		});
	}),

	/**
	 * Bans an IP address
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} value - the ip address that is going to be banned
	 * @param {String} reason - the reason for the ban
	 * @param {String} expiresAt - the time the ban expires
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	banIP: hooks.adminRequired((session, value, reason, expiresAt, cb, userId) => {
		async.waterfall([
			(next) => {
				if (value === '') return next('You must provide an IP address to ban.');
				else if (reason === '') return next('You must provide a reason for the ban.');
				else return next();
			},

			(next) => {
				if (!expiresAt || typeof expiresAt !== 'string') return next('Invalid expire date.');
				let date = new Date();
				switch(expiresAt) {
					case '1h':
						expiresAt = date.setHours(date.getHours() + 1);
						break;
					case '12h':
						expiresAt = date.setHours(date.getHours() + 12);
						break;
					case '1d':
						expiresAt = date.setDate(date.getDate() + 1);
						break;
					case '1w':
						expiresAt = date.setDate(date.getDate() + 7);
						break;
					case '1m':
						expiresAt = date.setMonth(date.getMonth() + 1);
						break;
					case '3m':
						expiresAt = date.setMonth(date.getMonth() + 3);
						break;
					case '6m':
						expiresAt = date.setMonth(date.getMonth() + 6);
						break;
					case '1y':
						expiresAt = date.setFullYear(date.getFullYear() + 1);
						break;
					case 'never':
						expiresAt = new Date(3093527980800000);
						break;
					default:
						return next('Invalid expire date.');
				}

				next();
			},

			(next) => {
				punishments.addPunishment('banUserIp', value, reason, expiresAt, userId, next)
			}
		], async (err, punishment) => {
			if (err && err !== true) {
				err = await utils.getError(err);
				logger.error("BAN_IP", `User ${userId} failed to ban IP address ${value} with the reason ${reason}. '${err}'`);
				cb({ status: 'failure', message: err });
			}
			logger.success("BAN_IP", `User ${userId} has successfully banned IP address ${value} with the reason ${reason}.`);
			cache.pub('ip.ban', { ip: value, punishment });
			return cb({
				status: 'success',
				message: 'Successfully banned IP address.'
			});
		});
	}),

};
