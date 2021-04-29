import async from "async";

import { isAdminRequired } from "./hooks";

import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const WSModule = moduleManager.modules.ws;
const CacheModule = moduleManager.modules.cache;

CacheModule.runJob("SUB", {
	channel: "dataRequest.resolve",
	cb: dataRequestId => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.users",
			args: ["event:admin.dataRequests.resolved", { data: { dataRequestId } }]
		});
	}
});

export default {
	/**
	 * Gets all unresolved data requests
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Function} cb - gets called with the result
	 */
	index: isAdminRequired(async function index(session, cb) {
		const dataRequestModel = await DBModule.runJob("GET_MODEL", { modelName: "dataRequest" }, this);

		async.waterfall(
			[
				next => {
					dataRequestModel.find({ resolved: false }).sort({ createdAt: "desc" }).exec(next);
				}
			],
			async (err, requests) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "DATA_REQUESTS_INDEX", `Indexing data requests failed. "${err}"`);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "DATA_REQUESTS_INDEX", `Indexing data requests successful.`, false);

				return cb({ status: "success", data: { requests } });
			}
		);
	}),

	/**
	 * Resolves a data request
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {object} dataRequestId - the id of the data request to resolve
	 * @param {Function} cb - gets called with the result
	 */
	resolve: isAdminRequired(async function update(session, dataRequestId, cb) {
		const dataRequestModel = await DBModule.runJob("GET_MODEL", { modelName: "dataRequest" }, this);

		async.waterfall(
			[
				next => {
					if (!dataRequestId || typeof dataRequestId !== "string")
						return next("Please provide a data request id.");
					return next();
				},

				next => {
					dataRequestModel.updateOne({ _id: dataRequestId }, { resolved: true }, { upsert: true }, err =>
						next(err)
					);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"DATA_REQUESTS_RESOLVE",
						`Resolving data request ${dataRequestId} failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				CacheModule.runJob("PUB", { channel: "dataRequest.resolve", value: dataRequestId });

				this.log(
					"SUCCESS",
					"DATA_REQUESTS_RESOLVE",
					`Resolving data request "${dataRequestId}" successful for user ${session.userId}".`
				);

				return cb({
					status: "success",
					message: "Successfully resolved data request."
				});
			}
		);
	})
};
