import config from "config";
import mongoose from "mongoose";
import bluebird from "bluebird";

import CoreClass from "../../core";

const regex = {
	azAZ09_: /^[A-Za-z0-9_]+$/,
	az09_: /^[a-z0-9_]+$/,
	emailSimple: /^[\x00-\x7F]+@[a-z0-9]+\.[a-z0-9]+(\.[a-z0-9]+)?$/,
	ascii: /^[\x00-\x7F]+$/,
	custom: regex => new RegExp(`^[${regex}]+$`)
};

const isLength = (string, min, max) => !(typeof string !== "string" || string.length < min || string.length > max);

mongoose.Promise = bluebird;

class DBModule extends CoreClass {
	constructor() {
		super("db");
	}

	initialize() {
		return new Promise((resolve, reject) => {
			this.schemas = {};
			this.models = {};

			const mongoUrl = config.get("mongo").url;

			mongoose
				.connect(mongoUrl, {
					useNewUrlParser: true,
					useUnifiedTopology: true,
					useCreateIndex: true
				})
				.then(async () => {
					this.schemas = {
						song: {},
						queueSong: {},
						station: {},
						user: {},
						activity: {},
						playlist: {},
						news: {},
						report: {},
						punishment: {}
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
					await importSchema("activity");
					await importSchema("playlist");
					await importSchema("news");
					await importSchema("report");
					await importSchema("punishment");

					this.models = {
						song: mongoose.model("song", this.schemas.song),
						queueSong: mongoose.model("queueSong", this.schemas.queueSong),
						station: mongoose.model("station", this.schemas.station),
						user: mongoose.model("user", this.schemas.user),
						activity: mongoose.model("activity", this.schemas.activity),
						playlist: mongoose.model("playlist", this.schemas.playlist),
						news: mongoose.model("news", this.schemas.news),
						report: mongoose.model("report", this.schemas.report),
						punishment: mongoose.model("punishment", this.schemas.punishment)
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
						// this.failed = true;
						// this._lockdown();
						this.setStatus("FAILED");
					});

					// User
					this.schemas.user
						.path("username")
						.validate(
							username => isLength(username, 2, 32) && regex.custom("a-zA-Z0-9_-").test(username),
							"Invalid username."
						);

					this.schemas.user.path("email.address").validate(email => {
						if (!isLength(email, 3, 254)) return false;
						if (email.indexOf("@") !== email.lastIndexOf("@")) return false;
						return regex.emailSimple.test(email) && regex.ascii.test(email);
					}, "Invalid email.");

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
									else if (c >= 3) reject(new Error("User already has 3 stations."));
									else resolve();
								});
							}),
						message: "User already has 3 stations."
					});

					/*
					this.schemas.station.path('queue').validate((queue, callback) => { //Callback no longer works, see station max count
						let totalDuration = 0;
						queue.forEach((song) => {
							totalDuration += song.duration;
						});
						return callback(totalDuration <= 3600 * 3);
					}, 'The max length of the queue is 3 hours.');
		
					this.schemas.station.path('queue').validate((queue, callback) => { //Callback no longer works, see station max count
						if (queue.length === 0) return callback(true);
						let totalDuration = 0;
						const userId = queue[queue.length - 1].requestedBy;
						queue.forEach((song) => {
							if (userId === song.requestedBy) {
								totalDuration += song.duration;
							}
						});
						return callback(totalDuration <= 900);
					}, 'The max length of songs per user is 15 minutes.');
		
					this.schemas.station.path('queue').validate((queue, callback) => { //Callback no longer works, see station max count
						if (queue.length === 0) return callback(true);
						let totalSongs = 0;
						const userId = queue[queue.length - 1].requestedBy;
						queue.forEach((song) => {
							if (userId === song.requestedBy) {
								totalSongs++;
							}
						});
						if (totalSongs <= 2) return callback(true);
						if (totalSongs > 3) return callback(false);
						if (queue[queue.length - 2].requestedBy !== userId || queue[queue.length - 3] !== userId) return callback(true);
						return callback(false);
					}, 'The max amount of songs per user is 3, and only 2 in a row is allowed.');
					*/

					// Song
					const songTitle = title => isLength(title, 1, 100);
					this.schemas.song.path("title").validate(songTitle, "Invalid title.");
					this.schemas.queueSong.path("title").validate(songTitle, "Invalid title.");

					this.schemas.song
						.path("artists")
						.validate(artists => !(artists.length < 1 || artists.length > 10), "Invalid artists.");
					this.schemas.queueSong
						.path("artists")
						.validate(artists => !(artists.length < 0 || artists.length > 10), "Invalid artists.");

					const songArtists = artists =>
						artists.filter(artist => isLength(artist, 1, 64) && artist !== "NONE").length ===
						artists.length;
					this.schemas.song.path("artists").validate(songArtists, "Invalid artists.");
					this.schemas.queueSong.path("artists").validate(songArtists, "Invalid artists.");

					const songGenres = genres => {
						if (genres.length < 1 || genres.length > 16) return false;
						return (
							genres.filter(genre => isLength(genre, 1, 32) && regex.ascii.test(genre)).length ===
							genres.length
						);
					};
					this.schemas.song.path("genres").validate(songGenres, "Invalid genres.");
					this.schemas.queueSong.path("genres").validate(songGenres, "Invalid genres.");

					const songThumbnail = thumbnail => {
						if (!isLength(thumbnail, 1, 256)) return false;
						if (config.get("cookie.secure") === true) return thumbnail.startsWith("https://");
						return thumbnail.startsWith("http://") || thumbnail.startsWith("https://");
					};
					this.schemas.song.path("thumbnail").validate(songThumbnail, "Invalid thumbnail.");
					this.schemas.queueSong.path("thumbnail").validate(songThumbnail, "Invalid thumbnail.");

					// Playlist
					this.schemas.playlist
						.path("displayName")
						.validate(
							displayName => isLength(displayName, 1, 32) && regex.ascii.test(displayName),
							"Invalid display name."
						);

					this.schemas.playlist.path("createdBy").validate(createdBy => {
						this.models.playlist.countDocuments({ createdBy }, (err, c) => !(err || c >= 10));
					}, "Max 10 playlists per user.");

					this.schemas.playlist
						.path("songs")
						.validate(songs => songs.length <= 5000, "Max 5000 songs per playlist.");

					this.schemas.playlist.path("songs").validate(songs => {
						if (songs.length === 0) return true;
						return songs[0].duration <= 10800;
					}, "Max 3 hours per song.");

					// Report
					this.schemas.report
						.path("description")
						.validate(
							description =>
								!description || (isLength(description, 0, 400) && regex.ascii.test(description)),
							"Invalid description."
						);

					resolve();
				})
				.catch(err => {
					this.log("ERROR", err);
					reject(err);
				});
		});
	}

	GET_MODEL(payload) {
		return new Promise(resolve => {
			resolve(this.models[payload.modelName]);
		});
	}

	GET_SCHEMA(payload) {
		return new Promise(resolve => {
			resolve(this.schemas[payload.schemaName]);
		});
	}

	passwordValid(password) {
		return isLength(password, 6, 200);
	}
}

export default new DBModule();
