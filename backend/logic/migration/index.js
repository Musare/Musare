import async from "async";
import config from "config";
import mongoose from "mongoose";
import bluebird from "bluebird";
import fs from "fs";

import { fileURLToPath } from "url";
import path from "path";

import CoreClass from "../../core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let MigrationModule;

mongoose.Promise = bluebird;

class _MigrationModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("migration");

		MigrationModule = this;
	}

	/**
	 * Initialises the migration module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	initialize() {
		return new Promise((resolve, reject) => {
			this.models = {};

			const mongoUrl = config.get("mongo").url;

			mongoose
				.connect(mongoUrl, {
					useNewUrlParser: true,
					useUnifiedTopology: true,
					useCreateIndex: true
				})
				.then(async () => {
					mongoose.connection.on("error", err => {
						this.log("ERROR", err);
					});

					mongoose.connection.on("disconnected", () => {
						this.log("ERROR", "Disconnected, going to try to reconnect...");
						this.setStatus("RECONNECTING");
					});

					mongoose.connection.on("reconnected", () => {
						this.log("INFO", "Reconnected.");
						this.setStatus("READY");
					});

					mongoose.connection.on("reconnectFailed", () => {
						this.log("INFO", "Reconnect failed, stopping reconnecting.");
						// this.failed = true;
						// this._lockdown();
						this.setStatus("FAILED");
					});

					this.models = {
						song: mongoose.model("song", new mongoose.Schema({}, { strict: false })),
						queueSong: mongoose.model("queueSong", new mongoose.Schema({}, { strict: false })),
						station: mongoose.model("station", new mongoose.Schema({}, { strict: false })),
						user: mongoose.model("user", new mongoose.Schema({}, { strict: false })),
						activity: mongoose.model("activity", new mongoose.Schema({}, { strict: false })),
						playlist: mongoose.model("playlist", new mongoose.Schema({}, { strict: false })),
						news: mongoose.model("news", new mongoose.Schema({}, { strict: false })),
						report: mongoose.model("report", new mongoose.Schema({}, { strict: false })),
						punishment: mongoose.model("punishment", new mongoose.Schema({}, { strict: false }))
					};

					const files = fs.readdirSync(path.join(__dirname, "migrations"));
					const migrations = files.length;

					async.timesLimit(
						migrations,
						1,
						(index, next) => {
							MigrationModule.runJob("RUN_MIGRATION", { index: index + 1 }, null, -1)
								.then(() => {
									next();
								})
								.catch(err => {
									next(err);
								});
						},
						err => {
							if (err) console.log("Migration error", err);
							else console.log("Migration completed");
						}
					);

					resolve();
				})
				.catch(err => {
					this.log("ERROR", err);
					reject(err);
				});
		});
	}

	/**
	 * Returns a database model
	 *
	 * @param {object} payload - object containing the payload
	 * @param {object} payload.modelName - name of the model to get
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_MODEL(payload) {
		return new Promise(resolve => {
			resolve(MigrationModule.models[payload.modelName]);
		});
	}

	/**
	 * Runs migrations
	 *
	 * @param {object} payload - object containing the payload
	 * @param {object} payload.index - migration index
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	RUN_MIGRATION(payload) {
		return new Promise((resolve, reject) => {
			import(`./migrations/migration${payload.index}`).then(module => {
				this.log("INFO", `Running migration ${payload.index}`);
				module.default
					.apply(this, [MigrationModule])
					.then(response => {
						resolve(response);
					})
					.catch(err => {
						reject(err);
					});
			});
		});
	}
}

export default new _MigrationModule();
