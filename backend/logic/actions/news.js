import async from "async";

import { isAdminRequired } from "./hooks";

import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const WSModule = moduleManager.modules.ws;
const CacheModule = moduleManager.modules.cache;

CacheModule.runJob("SUB", {
	channel: "news.create",
	cb: news => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.news",
			args: ["event:admin.news.created", { data: { news } }]
		});

		if (news.status === "published")
			WSModule.runJob("EMIT_TO_ROOM", {
				room: "news",
				args: ["event:news.created", { data: { news } }]
			});
	}
});

CacheModule.runJob("SUB", {
	channel: "news.remove",
	cb: newsId => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.news",
			args: ["event:admin.news.deleted", { data: { newsId } }]
		});

		WSModule.runJob("EMIT_TO_ROOM", {
			room: "news",
			args: ["event:news.deleted", { data: { newsId } }]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "news.update",
	cb: news => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.news",
			args: ["event:admin.news.updated", { data: { news } }]
		});

		WSModule.runJob("EMIT_TO_ROOM", {
			room: "news",
			args: ["event:news.updated", { data: { news } }]
		});
	}
});

export default {
	/**
	 * Gets news items, used in the admin news page by the AdvancedTable component
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param page - the page
	 * @param pageSize - the size per page
	 * @param properties - the properties to return for each news item
	 * @param sort - the sort object
	 * @param queries - the queries array
	 * @param operator - the operator for queries
	 * @param cb
	 */
	getData: isAdminRequired(async function getSet(session, page, pageSize, properties, sort, queries, operator, cb) {
		const newsModel = await DBModule.runJob("GET_MODEL", { modelName: "news" }, this);

		async.waterfall(
			[
				// Creates pipeline array
				next => next(null, []),

				// If a filter exists for createdBy, add createdByUsername property to all documents
				(pipeline, next) => {
					// Check if a filter with the createdBy property exists
					const createdByFilterExists =
						queries.map(query => query.filter.property).indexOf("createdBy") !== -1;
					// If no such filter exists, skip this function
					if (!createdByFilterExists) return next(null, pipeline);

					// Adds createdByOID field, which is an ObjectId version of createdBy
					pipeline.push({
						$addFields: {
							createdByOID: {
								$convert: {
									input: "$createdBy",
									to: "objectId",
									onError: "unknown",
									onNull: "unknown"
								}
							}
						}
					});

					// Looks up user(s) with the same _id as the createdByOID and puts the result in the createdByUser field
					pipeline.push({
						$lookup: {
							from: "users",
							localField: "createdByOID",
							foreignField: "_id",
							as: "createdByUser"
						}
					});

					// Unwinds the createdByUser array field into an object
					pipeline.push({
						$unwind: {
							path: "$createdByUser",
							preserveNullAndEmptyArrays: true
						}
					});

					// Adds createdByUsername field from the createdByUser username, or unknown if it doesn't exist
					pipeline.push({
						$addFields: {
							createdByUsername: {
								$ifNull: ["$createdByUser.username", "unknown"]
							}
						}
					});

					// Removes the createdByOID and createdByUser property, just in case it doesn't get removed at a later stage
					pipeline.push({
						$project: {
							createdByOID: 0,
							createdByUser: 0
						}
					});

					return next(null, pipeline);
				},

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
							newQuery[filter.property] = { $lte: Number(data) };
						} else if (filterType === "numberLesser") {
							newQuery[filter.property] = { $lt: Number(data) };
						} else if (filterType === "numberGreater") {
							newQuery[filter.property] = { $gt: Number(data) };
						} else if (filterType === "numberGreaterEqual") {
							newQuery[filter.property] = { $gte: Number(data) };
						} else if (filterType === "numberEquals") {
							newQuery[filter.property] = { $eq: Number(data) };
						} else if (filterType === "boolean") {
							newQuery[filter.property] = { $eq: !!data };
						}

						if (filter.property === "createdBy")
							return { $or: [newQuery, { createdByUsername: newQuery.createdBy }] };

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
					newsModel.aggregate(pipeline).exec((err, result) => {
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
			async (err, count, news) => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "NEWS_GET_DATA", `Failed to get data from news. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "NEWS_GET_DATA", `Got data from news successfully.`);
				return cb({
					status: "success",
					message: "Successfully got data from news.",
					data: { data: news, count }
				});
			}
		);
	}),

	/**
	 * Gets all news items that are published
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Function} cb - gets called with the result
	 */
	async getPublished(session, cb) {
		const newsModel = await DBModule.runJob("GET_MODEL", { modelName: "news" }, this);
		async.waterfall(
			[
				next => {
					newsModel.find({ status: "published" }).sort({ createdAt: "desc" }).exec(next);
				}
			],
			async (err, news) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "NEWS_INDEX", `Indexing news failed. "${err}"`);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "NEWS_INDEX", `Indexing news successful.`, false);

				return cb({ status: "success", data: { news } });
			}
		);
	},

	/**
	 * Gets a news item by id
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} newsId - the news item id
	 * @param {Function} cb - gets called with the result
	 */
	async getNewsFromId(session, newsId, cb) {
		const newsModel = await DBModule.runJob("GET_MODEL", { modelName: "news" }, this);

		async.waterfall(
			[
				next => {
					newsModel.findById(newsId, next);
				}
			],
			async (err, news) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "GET_NEWS_FROM_ID", `Getting news item ${newsId} failed. "${err}"`);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "GET_NEWS_FROM_ID", `Got news item ${newsId} successfully.`, false);

				return cb({ status: "success", data: { news } });
			}
		);
	},
	/**
	 * Creates a news item
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {object} data - the object of the news data
	 * @param {Function} cb - gets called with the result
	 */
	create: isAdminRequired(async function create(session, data, cb) {
		const newsModel = await DBModule.runJob("GET_MODEL", { modelName: "news" }, this);
		async.waterfall(
			[
				next => {
					data.createdBy = session.userId;
					data.createdAt = Date.now();
					newsModel.create(data, next);
				}
			],
			async (err, news) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "NEWS_CREATE", `Creating news failed. "${err}"`);
					return cb({ status: "error", message: err });
				}

				CacheModule.runJob("PUB", { channel: "news.create", value: news });

				this.log("SUCCESS", "NEWS_CREATE", `Creating news successful.`);

				return cb({
					status: "success",
					message: "Successfully created News"
				});
			}
		);
	}),

	/**
	 * Gets the latest news item
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Function} cb - gets called with the result
	 */
	async newest(session, cb) {
		const newsModel = await DBModule.runJob("GET_MODEL", { modelName: "news" }, this);
		async.waterfall([next => newsModel.findOne({}).sort({ createdAt: "desc" }).exec(next)], async (err, news) => {
			if (err) {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log("ERROR", "NEWS_NEWEST", `Getting the latest news failed. "${err}"`);
				return cb({ status: "error", message: err });
			}

			this.log("SUCCESS", "NEWS_NEWEST", `Successfully got the latest news.`, false);
			return cb({ status: "success", data: { news } });
		});
	},

	/**
	 * Removes a news item
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {object} newsId - the id of the news item we want to remove
	 * @param {Function} cb - gets called with the result
	 */
	remove: isAdminRequired(async function remove(session, newsId, cb) {
		const newsModel = await DBModule.runJob("GET_MODEL", { modelName: "news" }, this);

		async.waterfall(
			[
				next => {
					if (!newsId) return next("Please provide a news item id to update.");
					return next();
				},

				next => {
					newsModel.deleteOne({ _id: newsId }, err => next(err));
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"NEWS_REMOVE",
						`Removing news "${newsId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				CacheModule.runJob("PUB", { channel: "news.remove", value: newsId });

				this.log("SUCCESS", "NEWS_REMOVE", `Removing news "${newsId}" successful by user "${session.userId}".`);

				return cb({
					status: "success",
					message: "Successfully removed News"
				});
			}
		);
	}),

	/**
	 * Updates a news item
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} newsId - the id of the news item
	 * @param {object} item - the news item object
	 * @param {string} item.status - the status of the news e.g. published
	 * @param {string} item.title - taken from a level-1 heading at the top of the markdown
	 * @param {string} item.markdown - the markdown that forms the content of the news
	 * @param {Function} cb - gets called with the result
	 */
	update: isAdminRequired(async function update(session, newsId, item, cb) {
		const newsModel = await DBModule.runJob("GET_MODEL", { modelName: "news" }, this);

		async.waterfall(
			[
				next => {
					if (!newsId) return next("Please provide a news item id to update.");
					return next();
				},

				next => {
					newsModel.updateOne({ _id: newsId }, item, { upsert: true }, err => next(err));
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"NEWS_UPDATE",
						`Updating news item "${newsId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				CacheModule.runJob("PUB", { channel: "news.update", value: { ...item, _id: newsId } });

				this.log(
					"SUCCESS",
					"NEWS_UPDATE",
					`Updating news item "${newsId}" successful for user "${session.userId}".`
				);
				return cb({
					status: "success",
					message: "Successfully updated news item"
				});
			}
		);
	})
};
