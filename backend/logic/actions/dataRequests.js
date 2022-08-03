import async from "async";

import { isAdminRequired } from "./hooks";

// eslint-disable-next-line
import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const WSModule = moduleManager.modules.ws;
const CacheModule = moduleManager.modules.cache;

CacheModule.runJob("SUB", {
	channel: "dataRequest.update",
	cb: async dataRequestId => {
		const dataRequestModel = await DBModule.runJob("GET_MODEL", {
			modelName: "dataRequest"
		});

		dataRequestModel.findOne({ _id: dataRequestId }, (err, dataRequest) => {
			WSModule.runJob("EMIT_TO_ROOM", {
				room: "admin.users",
				args: ["event:admin.dataRequests.updated", { data: { dataRequest } }]
			});
		});
	}
});

export default {
	/**
	 * Gets data requests, used in the admin users page by the AdvancedTable component
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param page - the page
	 * @param pageSize - the size per page
	 * @param properties - the properties to return for each data request
	 * @param sort - the sort object
	 * @param queries - the queries array
	 * @param operator - the operator for queries
	 * @param cb
	 */
	getData: isAdminRequired(async function getSet(session, page, pageSize, properties, sort, queries, operator, cb) {
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
							modelName: "dataRequest",
							blacklistedProperties: [],
							specialProperties: {},
							specialQueries: {}
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
					this.log("ERROR", "DATA_REQUESTS_GET_DATA", `Failed to get data from data requests. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "DATA_REQUESTS_GET_DATA", `Got data from data requests successfully.`);
				return cb({
					status: "success",
					message: "Successfully got data from data requests.",
					data: response
				});
			}
		);
	}),

	/**
	 * Resolves a data request
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} dataRequestId - the id of the data request to resolve
	 * @param {boolean} resolved - whether to set to resolved to true or false
	 * @param {Function} cb - gets called with the result
	 */
	resolve: isAdminRequired(async function resolve(session, dataRequestId, resolved, cb) {
		const dataRequestModel = await DBModule.runJob("GET_MODEL", { modelName: "dataRequest" }, this);

		async.waterfall(
			[
				next => {
					if (!dataRequestId || typeof dataRequestId !== "string")
						return next("Please provide a data request id.");
					return next();
				},

				next => {
					dataRequestModel.updateOne({ _id: dataRequestId }, { resolved }, { upsert: true }, err =>
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
						`${resolved ? "R" : "Unr"}esolving data request ${dataRequestId} failed for user "${
							session.userId
						}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				CacheModule.runJob("PUB", { channel: "dataRequest.update", value: dataRequestId });

				this.log(
					"SUCCESS",
					"DATA_REQUESTS_RESOLVE",
					`${resolved ? "R" : "Unr"}esolving data request "${dataRequestId}" successful for user ${
						session.userId
					}".`
				);

				return cb({
					status: "success",
					message: `Successfully ${resolved ? "" : "un"}resolved data request.`
				});
			}
		);
	})
};
