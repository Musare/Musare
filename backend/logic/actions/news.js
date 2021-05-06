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
	}
});

CacheModule.runJob("SUB", {
	channel: "news.remove",
	cb: newsId => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.news",
			args: ["event:admin.news.removed", { data: { newsId } }]
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
	}
});

export default {
	/**
	 * Gets all news items that are published
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Function} cb - gets called with the result
	 */
	async index(session, cb) {
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
