import config from "config";
import mongoose from "mongoose";
import bluebird from "bluebird";
import async from "async";

import CoreClass from "../../core";

const REQUIRED_DOCUMENT_VERSIONS = {
	activity: 2,
	news: 3,
	playlist: 6,
	punishment: 1,
	queueSong: 1,
	report: 6,
	song: 9,
	station: 9,
	user: 4,
	youtubeApiRequest: 1,
	youtubeVideo: 1,
	ratings: 1,
	importJob: 1
};

const regex = {
	azAZ09_: /^[A-Za-z0-9_]+$/,
	az09_: /^[a-z0-9_]+$/,
	emailSimple: /^[\x00-\x7F]+@[a-z0-9]+\.[a-z0-9]+(\.[a-z0-9]+)?$/,
	ascii: /^[\x00-\x7F]+$/,
	name: /^[\p{L}0-9 .'_-]+$/u,
	custom: regex => new RegExp(`^[${regex}]+$`)
};

const isLength = (string, min, max) => !(typeof string !== "string" || string.length < min || string.length > max);

mongoose.Promise = bluebird;

let DBModule;

class _DBModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("db");

		DBModule = this;
	}

	/**
	 * Initialises the database module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	initialize() {
		return new Promise((resolve, reject) => {
			this.schemas = {};
			this.models = {};

			const mongoUrl = config.get("mongo").url;

			mongoose
				.connect(mongoUrl, {
					useNewUrlParser: true,
					useUnifiedTopology: true
				})
				.then(async () => {
					this.schemas = {
						song: {},
						queueSong: {},
						station: {},
						user: {},
						dataRequest: {},
						activity: {},
						playlist: {},
						news: {},
						report: {},
						punishment: {},
						youtubeApiRequest: {},
						youtubeVideo: {},
						ratings: {}
					};

					const importSchema = schemaName =>
						new Promise(resolve => {
							import(`./schemas/${schemaName}`).then(schema => {
								this.schemas[schemaName] = new mongoose.Schema(schema.default);
								return resolve();
							});
						});

					await importSchema("song");
					await importSchema("queueSong");
					await importSchema("station");
					await importSchema("user");
					await importSchema("dataRequest");
					await importSchema("activity");
					await importSchema("playlist");
					await importSchema("news");
					await importSchema("report");
					await importSchema("punishment");
					await importSchema("youtubeApiRequest");
					await importSchema("youtubeVideo");
					await importSchema("ratings");
					await importSchema("importJob");

					this.models = {
						song: mongoose.model("song", this.schemas.song),
						queueSong: mongoose.model("queueSong", this.schemas.queueSong),
						station: mongoose.model("station", this.schemas.station),
						user: mongoose.model("user", this.schemas.user),
						dataRequest: mongoose.model("dataRequest", this.schemas.dataRequest),
						activity: mongoose.model("activity", this.schemas.activity),
						playlist: mongoose.model("playlist", this.schemas.playlist),
						news: mongoose.model("news", this.schemas.news),
						report: mongoose.model("report", this.schemas.report),
						punishment: mongoose.model("punishment", this.schemas.punishment),
						youtubeApiRequest: mongoose.model("youtubeApiRequest", this.schemas.youtubeApiRequest),
						youtubeVideo: mongoose.model("youtubeVideo", this.schemas.youtubeVideo),
						ratings: mongoose.model("ratings", this.schemas.ratings),
						importJob: mongoose.model("importJob", this.schemas.importJob)
					};

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
						this.setStatus("FAILED");
					});

					// User
					this.schemas.user
						.path("username")
						.validate(
							username =>
								isLength(username, 2, 32) &&
								regex.custom("a-zA-Z0-9_-").test(username) &&
								username.replaceAll(/[_]/g, "").length > 0,
							"Invalid username."
						);

					this.schemas.user.path("email.address").validate(email => {
						if (!isLength(email, 3, 254)) return false;
						if (email.indexOf("@") !== email.lastIndexOf("@")) return false;
						return regex.emailSimple.test(email) && regex.ascii.test(email);
					}, "Invalid email.");

					this.schemas.user
						.path("name")
						.validate(
							name =>
								isLength(name, 1, 64) &&
								regex.name.test(name) &&
								name.replaceAll(/[ .'_-]/g, "").length > 0,
							"Invalid name."
						);

					// Station
					this.schemas.station
						.path("name")
						.validate(id => isLength(id, 2, 16) && regex.az09_.test(id), "Invalid station name.");

					this.schemas.station
						.path("displayName")
						.validate(
							displayName => isLength(displayName, 2, 32) && regex.ascii.test(displayName),
							"Invalid display name."
						);

					this.schemas.station.path("description").validate(description => {
						if (!isLength(description, 2, 200)) return false;
						const characters = description.split("");
						return characters.filter(character => character.charCodeAt(0) === 21328).length === 0;
					}, "Invalid display name.");

					this.schemas.station.path("owner").validate({
						validator: owner =>
							new Promise((resolve, reject) => {
								this.models.station.countDocuments({ owner }, (err, c) => {
									if (err) reject(new Error("A mongo error happened."));
									else if (c >= 25) reject(new Error("User already has 25 stations."));
									else resolve();
								});
							}),
						message: "User already has 25 stations."
					});

					// Song
					const songTitle = title => isLength(title, 1, 100);
					this.schemas.song.path("title").validate(songTitle, "Invalid title.");

					this.schemas.song.path("artists").validate(artists => artists.length <= 10, "Invalid artists.");

					const songArtists = artists =>
						artists.filter(artist => isLength(artist, 1, 64) && artist !== "NONE").length ===
						artists.length;
					this.schemas.song.path("artists").validate(songArtists, "Invalid artists.");

					const songGenres = genres => {
						if (genres.length > 16) return false;
						return (
							genres.filter(genre => isLength(genre, 1, 32) && regex.ascii.test(genre)).length ===
							genres.length
						);
					};
					this.schemas.song.path("genres").validate(songGenres, "Invalid genres.");

					const songTags = tags =>
						tags.filter(tag => /^[a-zA-Z0-9_]{1,64}$|^[a-zA-Z0-9_]{1,64}\[[a-zA-Z0-9_]{1,64}\]$/.test(tag))
							.length === tags.length;
					this.schemas.song.path("tags").validate(songTags, "Invalid tags.");

					const songThumbnail = thumbnail => {
						if (!isLength(thumbnail, 1, 256)) return false;
						if (config.get("cookie.secure") === true) return thumbnail.startsWith("https://");
						return thumbnail.startsWith("http://") || thumbnail.startsWith("https://");
					};
					this.schemas.song.path("thumbnail").validate(songThumbnail, "Invalid thumbnail.");

					// Playlist
					this.schemas.playlist
						.path("displayName")
						.validate(
							displayName => isLength(displayName, 1, 32) && regex.ascii.test(displayName),
							"Invalid display name."
						);

					this.schemas.playlist.path("createdBy").validate(createdBy => {
						this.models.playlist.countDocuments({ createdBy }, (err, c) => !(err || c >= 100));
					}, "Max 100 playlists per user.");

					this.schemas.playlist
						.path("songs")
						.validate(songs => songs.length <= 10000, "Max 10000 songs per playlist.");

					// this.schemas.playlist.path("songs").validate(songs => {
					// 	if (songs.length === 0) return true;
					// 	return songs[0].duration <= 10800;
					// }, "Max 3 hours per song.");

					this.models.activity.syncIndexes();
					this.models.dataRequest.syncIndexes();
					this.models.news.syncIndexes();
					this.models.playlist.syncIndexes();
					this.models.punishment.syncIndexes();
					this.models.queueSong.syncIndexes();
					this.models.report.syncIndexes();
					this.models.song.syncIndexes();
					this.models.station.syncIndexes();
					this.models.user.syncIndexes();
					this.models.youtubeApiRequest.syncIndexes();
					this.models.youtubeVideo.syncIndexes();
					this.models.ratings.syncIndexes();
					this.models.importJob.syncIndexes();

					if (config.get("skipDbDocumentsVersionCheck")) resolve();
					else {
						this.runJob("CHECK_DOCUMENT_VERSIONS", {}, null, -1)
							.then(() => {
								resolve();
							})
							.catch(err => {
								reject(err);
							});
					}
				})
				.catch(err => {
					this.log("ERROR", err);
					reject(err);
				});
		});
	}

	/**
	 * Checks if all documents have the correct document version
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	CHECK_DOCUMENT_VERSIONS() {
		return new Promise((resolve, reject) => {
			async.each(
				Object.keys(REQUIRED_DOCUMENT_VERSIONS),
				(modelName, next) => {
					const model = DBModule.models[modelName];
					const requiredDocumentVersion = REQUIRED_DOCUMENT_VERSIONS[modelName];
					model.countDocuments({ documentVersion: { $ne: requiredDocumentVersion } }, (err, count) => {
						if (err) next(err);
						else if (count > 0)
							next(
								`Collection "${modelName}" has ${count} documents with a wrong document version. Run migration.`
							);
						else next();
					});
				},
				err => {
					if (err) reject(new Error(err));
					else resolve();
				}
			);
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
			resolve(DBModule.models[payload.modelName]);
		});
	}

	/**
	 * Returns a database schema
	 *
	 * @param {object} payload - object containing the payload
	 * @param {object} payload.schemaName - name of the schema to get
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_SCHEMA(payload) {
		return new Promise(resolve => {
			resolve(DBModule.schemas[payload.schemaName]);
		});
	}

	/**
	 * Gets data
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.page - the page
	 * @param {string} payload.pageSize - the page size
	 * @param {string} payload.properties - the properties to return for each song
	 * @param {string} payload.sort - the sort object
	 * @param {string} payload.queries - the queries array
	 * @param {string} payload.operator - the operator for queries
	 * @param {string} payload.modelName - the db collection modal name
	 * @param {string} payload.blacklistedProperties - the properties that are not allowed to be returned, filtered by or sorted by
	 * @param {string} payload.specialProperties - the special properties
	 * @param {string} payload.specialQueries - the special queries
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_DATA(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					// Creates pipeline array
					next => next(null, []),

					// If a query filter property or sort property is blacklisted, throw error
					(pipeline, next) => {
						const { sort, queries, blacklistedProperties } = payload;
						if (
							queries.some(query =>
								blacklistedProperties.some(blacklistedProperty =>
									blacklistedProperty.startsWith(query.filter.property)
								)
							)
						)
							return next("Unable to filter by blacklisted property.");
						if (
							Object.keys(sort).some(property =>
								blacklistedProperties.some(blacklistedProperty =>
									blacklistedProperty.startsWith(property)
								)
							)
						)
							return next("Unable to sort by blacklisted property.");

						return next(null, pipeline);
					},

					// If a filter or property exists for a special property, add some custom pipeline steps
					(pipeline, next) => {
						const { properties, queries, specialProperties } = payload;

						async.eachLimit(
							Object.entries(specialProperties),
							1,
							([specialProperty, pipelineSteps], next) => {
								// Check if a filter with the special property exists
								const filterExists =
									queries.map(query => query.filter.property).indexOf(specialProperty) !== -1;
								// Check if a property with the special property exists
								const propertyExists = properties.indexOf(specialProperty) !== -1;
								// If no such filter or property exists, skip this function
								if (!filterExists && !propertyExists) return next();
								// Add the specified pipeline steps into the pipeline
								pipeline.push(...pipelineSteps);
								return next();
							},
							err => {
								next(err, pipeline);
							}
						);
					},

					// Adds the match stage to aggregation pipeline, which is responsible for filtering
					(pipeline, next) => {
						const { queries, operator, specialQueries, specialFilters } = payload;

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
							} else if (filterType === "special") {
								pipeline.push(...specialFilters[filter.property](data));
								newQuery[filter.property] = { $eq: true };
							}

							if (specialQueries[filter.property]) {
								return specialQueries[filter.property](newQuery);
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
						const { sort } = payload;
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
						const { properties } = payload;

						pipeline.push({ $project: Object.fromEntries(properties.map(property => [property, 1])) });

						next(null, pipeline);
					},

					// Adds second project stage to aggregation pipeline, responsible for excluding some specific properties
					(pipeline, next) => {
						const { blacklistedProperties } = payload;
						if (blacklistedProperties.length > 0)
							pipeline.push({
								$project: Object.fromEntries(blacklistedProperties.map(property => [property, 0]))
							});

						next(null, pipeline);
					},

					// Adds the facet stage to aggregation pipeline, responsible for returning a total document count, skipping and limitting the documents that will be returned
					(pipeline, next) => {
						const { page, pageSize } = payload;

						pipeline.push({
							$facet: {
								count: [{ $count: "count" }],
								documents: [{ $skip: pageSize * (page - 1) }, { $limit: pageSize }]
							}
						});

						// console.dir(pipeline, { depth: 6 });

						next(null, pipeline);
					},

					(pipeline, next) => {
						const { modelName } = payload;

						DBModule.runJob("GET_MODEL", { modelName }, this)
							.then(model => {
								if (!model) return next("Invalid model.");
								return next(null, pipeline, model);
							})
							.catch(err => {
								next(err);
							});
					},

					// Executes the aggregation pipeline
					(pipeline, model, next) => {
						model.aggregate(pipeline).exec((err, result) => {
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
				(err, count, documents) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve({ data: documents, count });
				}
			);
		});
	}

	/**
	 * Checks if a password to be stored in the database has a valid length
	 *
	 * @param {object} password - the password itself
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	passwordValid(password) {
		return isLength(password, 6, 200);
	}
}

export default new _DBModule();
