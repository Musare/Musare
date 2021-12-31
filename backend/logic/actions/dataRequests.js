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
		const dataRequestModel = await DBModule.runJob("GET_MODEL", { modelName: "dataRequest" }, this);

		async.waterfall(
			[
				next => {
					const newQueries = queries.map(query => {
						const { data, filter, filterType } = query;
						const newQuery = {};
						if (filterType === "regex") {
							newQuery[filter.property] = new RegExp(`${data.slice(1, data.length - 1)}`, "i");
						} else if (filterType === "contains") {
							newQuery[filter.property] = new RegExp(
								`${data.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
								"i"
							);
						} else if (filterType === "exact") {
							newQuery[filter.property] = data.toString();
						} else if (filterType === "datetimeBefore") {
							newQuery[filter.property] = { $lte: new Date(data) };
						} else if (filterType === "datetimeAfter") {
							newQuery[filter.property] = { $gte: new Date(data) };
						}
						return newQuery;
					});

					const queryObject = {};
					if (newQueries.length > 0) {
						if (operator === "and") queryObject.$and = newQueries;
						else if (operator === "or") queryObject.$or = newQueries;
						else if (operator === "nor") queryObject.$nor = newQueries;
					}

					next(null, queryObject);
				},

				(queryObject, next) => {
					dataRequestModel.find(queryObject).count((err, count) => {
						next(err, queryObject, count);
					});
				},

				(queryObject, count, next) => {
					dataRequestModel
						.find(queryObject)
						.sort(sort)
						.skip(pageSize * (page - 1))
						.limit(pageSize)
						.select(properties.join(" "))
						.exec((err, dataRequests) => {
							next(err, count, dataRequests);
						});
				}
			],
			async (err, count, dataRequests) => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "DATA_REQUESTS_GET_DATA", `Failed to get data from data requests. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "DATA_REQUESTS_GET_DATA", `Got data from data requests successfully.`);
				return cb({
					status: "success",
					message: "Successfully got data from data requests.",
					data: { data: dataRequests, count }
				});
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
