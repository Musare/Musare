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
				// Creates pipeline array
				next => next(null, []),

				// Adds the match stage to aggregation pipeline, which is responsible for filtering
				(pipeline, next) => {
					let queryError;
					const newQueries = queries.flatMap(query => {
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
						} else if (filterType === "numberLesserEqual") {
							newQuery[filter.property] = { $lte: data };
						} else if (filterType === "numberLesser") {
							newQuery[filter.property] = { $lt: data };
						} else if (filterType === "numberGreater") {
							newQuery[filter.property] = { $gt: data };
						} else if (filterType === "numberGreaterEqual") {
							newQuery[filter.property] = { $gte: data };
						} else if (filterType === "numberEquals" || filterType === "boolean") {
							newQuery[filter.property] = { $eq: data };
						}

						return newQuery;
					});
					if (queryError) next(queryError);

					const queryObject = {};
					if (newQueries.length > 0) {
						if (operator === "and") queryObject.$and = newQueries;
						else if (operator === "or") queryObject.$or = newQueries;
						else if (operator === "nor") queryObject.$nor = newQueries;
					}

					pipeline.push({ $match: queryObject });

					next(null, pipeline);
				},

				// Adds sort stage to aggregation pipeline if there is at least one column being sorted, responsible for sorting data
				(pipeline, next) => {
					const newSort = Object.fromEntries(
						Object.entries(sort).map(([property, direction]) => [
							property,
							direction === "ascending" ? 1 : -1
						])
					);
					if (Object.keys(newSort).length > 0) pipeline.push({ $sort: newSort });
					next(null, pipeline);
				},

				// Adds first project stage to aggregation pipeline, responsible for including only the requested properties
				(pipeline, next) => {
					pipeline.push({ $project: Object.fromEntries(properties.map(property => [property, 1])) });

					next(null, pipeline);
				},

				// Adds the facet stage to aggregation pipeline, responsible for returning a total document count, skipping and limitting the documents that will be returned
				(pipeline, next) => {
					pipeline.push({
						$facet: {
							count: [{ $count: "count" }],
							documents: [{ $skip: pageSize * (page - 1) }, { $limit: pageSize }]
						}
					});

					// console.dir(pipeline, { depth: 6 });

					next(null, pipeline);
				},

				// Executes the aggregation pipeline
				(pipeline, next) => {
					dataRequestModel.aggregate(pipeline).exec((err, result) => {
						// console.dir(err);
						// console.dir(result, { depth: 6 });
						if (err) return next(err);
						if (result[0].count.length === 0) return next(null, 0, []);
						const { count } = result[0].count[0];
						const { documents } = result[0];
						// console.log(111, err, result, count, documents[0]);
						return next(null, count, documents);
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
