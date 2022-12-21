import async from "async";

/**
 * Migration 25
 *
 * Migration for changing youtubeId to mediaSource
 *
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const activityModel = await MigrationModule.runJob("GET_MODEL", { modelName: "activity" }, this);
	const playlistModel = await MigrationModule.runJob("GET_MODEL", { modelName: "playlist" }, this);
	const reportModel = await MigrationModule.runJob("GET_MODEL", { modelName: "report" }, this);
	const songModel = await MigrationModule.runJob("GET_MODEL", { modelName: "song" }, this);
	const stationModel = await MigrationModule.runJob("GET_MODEL", { modelName: "station" }, this);
	const ratingsModel = await MigrationModule.runJob("GET_MODEL", { modelName: "ratings" }, this);
	const stationHistoryModel = await MigrationModule.runJob("GET_MODEL", { modelName: "stationHistory" }, this);

	await new Promise((resolve, reject) => {
		this.log("INFO", `Migration 25. Updating activity with document version 2.`);

		activityModel.find({ documentVersion: 2 }, (err, activities) => {
			if (err) reject(err);
			else {
				async.eachLimit(
					activities.map(activity => activity._doc),
					1,
					(activity, next) => {
						const updateObject = { $set: { documentVersion: 3 } };

						if (activity.payload.youtubeId) {
							activity.payload.mediaSource = `youtube:${activity.payload.youtubeId}`;
							delete activity.payload.youtubeId;
							updateObject.$set.payload = activity.payload;
						}

						activityModel.updateOne({ _id: activity._id }, updateObject, next);
					},
					err => {
						this.log("INFO", `Migration 25. Activities found: ${activities.length}.`);
						if (err) reject(err);
						else resolve();
					}
				);
			}
		});
	});

	await new Promise((resolve, reject) => {
		this.log("INFO", `Migration 25. Updating playlist with document version 6.`);

		playlistModel.find({ documentVersion: 6 }, (err, documents) => {
			if (err) reject(err);
			else {
				async.eachLimit(
					documents.map(document => document._doc),
					1,
					(document, next) => {
						const updateObject = { $set: { documentVersion: 7 } };

						const songs = document.songs.map(song => {
							song.mediaSource = `youtube:${song.youtubeId}`;
							delete song.youtubeId;
							return song;
						});

						updateObject.$set.songs = songs;

						playlistModel.updateOne({ _id: document._id }, updateObject, next);
					},
					err => {
						this.log("INFO", `Migration 25. Playlists found: ${documents.length}.`);
						if (err) reject(err);
						else resolve();
					}
				);
			}
		});
	});

	await new Promise((resolve, reject) => {
		this.log("INFO", `Migration 25. Updating playlist with document version 6.`);

		reportModel.find({ documentVersion: 6 }, (err, documents) => {
			if (err) reject(err);
			else {
				async.eachLimit(
					documents.map(document => document._doc),
					1,
					(document, next) => {
						const updateObject = { $set: { documentVersion: 7 } };

						document.song.mediaSource = `youtube:${document.song.youtubeId}`;
						delete document.song.youtubeId;

						updateObject.$set.song = document.song;

						reportModel.updateOne({ _id: document._id }, updateObject, next);
					},
					err => {
						this.log("INFO", `Migration 25. Reports found: ${documents.length}.`);
						if (err) reject(err);
						else resolve();
					}
				);
			}
		});
	});

	await new Promise((resolve, reject) => {
		this.log("INFO", `Migration 25. Updating song with document version 9.`);

		songModel.find({ documentVersion: 9 }, (err, documents) => {
			if (err) reject(err);
			else {
				async.eachLimit(
					documents.map(document => document._doc),
					1,
					(document, next) => {
						const updateObject = { $set: { documentVersion: 10 } };

						updateObject.$set.mediaSource = `youtube:${document.youtubeId}`;
						updateObject.$unset = { youtubeId: "" };

						songModel.updateOne({ _id: document._id }, updateObject, next);
					},
					err => {
						this.log("INFO", `Migration 25. Songs found: ${documents.length}.`);
						if (err) reject(err);
						else resolve();
					}
				);
			}
		});
	});

	await new Promise((resolve, reject) => {
		this.log("INFO", `Migration 25. Updating station with document version 9.`);

		stationModel.find({ documentVersion: 9 }, (err, documents) => {
			if (err) reject(err);
			else {
				async.eachLimit(
					documents.map(document => document._doc),
					1,
					(document, next) => {
						const updateObject = { $set: { documentVersion: 10 } };

						if (document.currentSong) {
							document.currentSong.mediaSource = `youtube:${document.currentSong.youtubeId}`;
							delete document.currentSong.youtubeId;
							updateObject.$set.currentSong = document.currentSong;
						}

						const queue = document.queue.map(song => {
							song.mediaSource = `youtube:${song.youtubeId}`;
							delete song.youtubeId;
							return song;
						});
						updateObject.$set.queue = queue;

						stationModel.updateOne({ _id: document._id }, updateObject, next);
					},
					err => {
						this.log("INFO", `Migration 25. Stations found: ${documents.length}.`);
						if (err) reject(err);
						else resolve();
					}
				);
			}
		});
	});

	await new Promise((resolve, reject) => {
		this.log("INFO", `Migration 25. Updating ratings with document version 1.`);

		ratingsModel.find({ documentVersion: 1 }, (err, documents) => {
			if (err) reject(err);
			else {
				ratingsModel.collection.dropIndexes(() => {
					async.eachLimit(
						documents.map(document => document._doc),
						1,
						(document, next) => {
							const updateObject = { $set: { documentVersion: 2 } };

							if (document.youtubeId) {
								updateObject.$set.mediaSource = `youtube:${document.youtubeId}`;
								updateObject.$unset = { youtubeId: "" };
							}

							ratingsModel.updateOne({ _id: document._id }, updateObject, next);
						},
						err => {
							this.log("INFO", `Migration 25. Ratings found: ${documents.length}.`);
							if (err) reject(err);
							else resolve();
						}
					);
				});
			}
		});
	});

	await new Promise((resolve, reject) => {
		this.log("INFO", `Migration 25. Updating station history with document version 1.`);

		stationHistoryModel.find({ documentVersion: 1 }, (err, documents) => {
			if (err) reject(err);
			else {
				async.eachLimit(
					documents.map(document => document._doc),
					1,
					(document, next) => {
						const updateObject = { $set: { documentVersion: 2 } };

						document.payload.song.mediaSource = `youtube:${document.payload.song.youtubeId}`;
						delete document.payload.song.youtubeId;

						updateObject.$set.payload = document.payload;

						stationHistoryModel.updateOne({ _id: document._id }, updateObject, next);
					},
					err => {
						this.log("INFO", `Migration 25. Station history found: ${documents.length}.`);
						if (err) reject(err);
						else resolve();
					}
				);
			}
		});
	});
}
