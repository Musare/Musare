import async from "async";

import { isAdminRequired, isLoginRequired, isOwnerRequired } from "./hooks";
import db from "../db";
// const moduleManager = require("../../index");

// const logger = require("logger");
import utils from "../utils";

import cache from "../cache";

import punishments from "../punishments";

cache.runJob("SUB", {
	channel: "ip.ban",
	cb: data => {
		utils.runJob("EMIT_TO_ROOM", {
			room: "admin.punishments",
			args: ["event:admin.punishment.added", data.punishment]
		});
		utils.runJob("SOCKETS_FROM_IP", { ip: data.ip }).then(sockets => {
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
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	index: isAdminRequired(async (session, cb) => {
		const punishmentModel = await db.runJob("GET_MODEL", {
			modelName: "punishment"
		});
		async.waterfall(
			[
				next => {
					punishmentModel.find({}, next);
				}
			],
			async (err, punishments) => {
				if (err) {
					err = await utils.runJob("GET_ERROR", { error: err });
					console.log("ERROR", "PUNISHMENTS_INDEX", `Indexing punishments failed. "${err}"`);
					return cb({ status: "failure", message: err });
				}
				console.log("SUCCESS", "PUNISHMENTS_INDEX", "Indexing punishments successful.");
				return cb({ status: "success", data: punishments });
			}
		);
	}),

	/**
	 * Bans an IP address
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} value - the ip address that is going to be banned
	 * @param {string} reason - the reason for the ban
	 * @param {string} expiresAt - the time the ban expires
	 * @param {Function} cb - gets called with the result
	 */
	banIP: isAdminRequired((session, value, reason, expiresAt, cb) => {
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
					punishments
						.runJob("ADD_PUNISHMENT", {
							type: "banUserIp",
							value,
							reason,
							expiresAt,
							punishedBy: session.userId
						})
						.then(punishment => {
							next(null, punishment);
						})
						.catch(next);
				}
			],
			async (err, punishment) => {
				if (err && err !== true) {
					err = await utils.runJob("GET_ERROR", { error: err });
					console.log(
						"ERROR",
						"BAN_IP",
						`User ${session.userId} failed to ban IP address ${value} with the reason ${reason}. '${err}'`
					);
					cb({ status: "failure", message: err });
				}
				console.log(
					"SUCCESS",
					"BAN_IP",
					`User ${session.userId} has successfully banned IP address ${value} with the reason ${reason}.`
				);
				cache.runJob("PUB", {
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
