import async from "async";

import { useHasPermission } from "../hooks/hasPermission";

// eslint-disable-next-line
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
	getData: useHasPermission(
		"admin.view.news",
		async function getSet(session, page, pageSize, properties, sort, queries, operator, cb) {
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
								modelName: "news",
								blacklistedProperties: [],
								specialProperties: {
									createdBy: [
										{
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
										},
										{
											$lookup: {
												from: "users",
												localField: "createdByOID",
												foreignField: "_id",
												as: "createdByUser"
											}
										},
										{
											$unwind: {
												path: "$createdByUser",
												preserveNullAndEmptyArrays: true
											}
										},
										{
											$addFields: {
												createdByUsername: {
													$ifNull: ["$createdByUser.username", "unknown"]
												}
											}
										},
										{
											$project: {
												createdByOID: 0,
												createdByUser: 0
											}
										}
									]
								},
								specialQueries: {
									createdBy: newQuery => ({
										$or: [newQuery, { createdByUsername: newQuery.createdBy }]
									})
								}
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
						this.log("ERROR", "NEWS_GET_DATA", `Failed to get data from news. "${err}"`);
						return cb({ status: "error", message: err });
					}
					this.log("SUCCESS", "NEWS_GET_DATA", `Got data from news successfully.`);
					return cb({
						status: "success",
						message: "Successfully got data from news.",
						data: response
					});
				}
			);
		}
	),

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
	create: useHasPermission("news.create", async function create(session, data, cb) {
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
	 * @param {boolean} newUser - whether the user requesting the newest news is a new user
	 * @param {Function} cb - gets called with the result
	 */
	async newest(session, newUser, cb) {
		const newsModel = await DBModule.runJob("GET_MODEL", { modelName: "news" }, this);
		const query = { status: "published" };
		if (newUser) query.showToNewUsers = true;
		async.waterfall(
			[next => newsModel.findOne(query).sort({ createdAt: "desc" }).exec(next)],
			async (err, news) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "NEWS_NEWEST", `Getting the latest news failed. "${err}"`);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "NEWS_NEWEST", `Successfully got the latest news.`, false);
				return cb({ status: "success", data: { news } });
			}
		);
	},

	/**
	 * Removes a news item
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {object} newsId - the id of the news item we want to remove
	 * @param {Function} cb - gets called with the result
	 */
	remove: useHasPermission("news.remove", async function remove(session, newsId, cb) {
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
	update: useHasPermission("news.update", async function update(session, newsId, item, cb) {
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
