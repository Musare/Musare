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
			args: ["event:admin.punishment.added", data.punishment]
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
	 * Gets all punishments
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Function} cb - gets called with the result
	 */
	index: isAdminRequired(async function index(session, cb) {
		const punishmentModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "punishment"
			},
			this
		);
		async.waterfall(
			[
				next => {
					punishmentModel.find({}, next);
				}
			],
			async (err, punishments) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "PUNISHMENTS_INDEX", `Indexing punishments failed. "${err}"`);
					return cb({ status: "failure", message: err });
				}
				this.log("SUCCESS", "PUNISHMENTS_INDEX", "Indexing punishments successful.");
				return cb({ status: "success", data: punishments });
			}
		);
	}),

	/**
	 * Gets a punishment by id
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} punishmentId - the punishment id
	 * @param {Function} cb - gets called with the result
	 */
	getPunishmentById: isAdminRequired(async function index(session, punishmentId, cb) {
		const punishmentModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "punishment"
			},
			this
		);
		async.waterfall(
			[
				next => {
					punishmentModel.findOne({ _id: punishmentId }, next);
				}
			],
			async (err, punishment) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"GET_PUNISHMENT_BY_ID",
						`Getting punishment with id ${punishmentId} failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log("SUCCESS", "GET_PUNISHMENT_BY_ID", `Got punishment with id ${punishmentId} successful.`);
				return cb({ status: "success", data: punishment });
			}
		);
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
					cb({ status: "failure", message: err });
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
