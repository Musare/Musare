import async from "async";

/**
 * Migration 1
 *
 * This migration is used to set the documentVersion to 1 for all documents that don't have a documentVersion yet, meaning they were created before the migration system
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const activityModel = await MigrationModule.runJob("GET_MODEL", { modelName: "activity" }, this);
	const newsModel = await MigrationModule.runJob("GET_MODEL", { modelName: "news" }, this);
	const playlistModel = await MigrationModule.runJob("GET_MODEL", { modelName: "playlist" }, this);
	const punishmentModel = await MigrationModule.runJob("GET_MODEL", { modelName: "punishment" }, this);
	const queueSongModel = await MigrationModule.runJob("GET_MODEL", { modelName: "queueSong" }, this);
	const reportModel = await MigrationModule.runJob("GET_MODEL", { modelName: "report" }, this);
	const songModel = await MigrationModule.runJob("GET_MODEL", { modelName: "song" }, this);
	const stationModel = await MigrationModule.runJob("GET_MODEL", { modelName: "station" }, this);
	const userModel = await MigrationModule.runJob("GET_MODEL", { modelName: "user" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					activityModel.updateMany(
						{ documentVersion: null },
						{ $set: { documentVersion: 1 } },
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 1 (activity). Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
								);

								next();
							}
						}
					);
				},

				next => {
					newsModel.updateMany({ documentVersion: null }, { $set: { documentVersion: 1 } }, (err, res) => {
						if (err) next(err);
						else {
							this.log(
								"INFO",
								`Migration 1 (news). Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
							);

							next();
						}
					});
				},

				next => {
					playlistModel.updateMany(
						{ documentVersion: null },
						{ $set: { documentVersion: 1 } },
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 1 (playlist). Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
								);

								next();
							}
						}
					);
				},

				next => {
					punishmentModel.updateMany(
						{ documentVersion: null },
						{ $set: { documentVersion: 1 } },
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 1 (punishment). Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
								);

								next();
							}
						}
					);
				},

				next => {
					queueSongModel.updateMany(
						{ documentVersion: null },
						{ $set: { documentVersion: 1 } },
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 1 (queueSong). Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
								);

								next();
							}
						}
					);
				},

				next => {
					reportModel.updateMany({ documentVersion: null }, { $set: { documentVersion: 1 } }, (err, res) => {
						if (err) next(err);
						else {
							this.log(
								"INFO",
								`Migration 1 (report). Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
							);

							next();
						}
					});
				},

				next => {
					songModel.updateMany({ documentVersion: null }, { $set: { documentVersion: 1 } }, (err, res) => {
						if (err) next(err);
						else {
							this.log(
								"INFO",
								`Migration 1 (song). Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
							);

							next();
						}
					});
				},

				next => {
					stationModel.updateMany({ documentVersion: null }, { $set: { documentVersion: 1 } }, (err, res) => {
						if (err) next(err);
						else {
							this.log(
								"INFO",
								`Migration 1 (station). Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
							);

							next();
						}
					});
				},

				next => {
					userModel.updateMany({ documentVersion: null }, { $set: { documentVersion: 1 } }, (err, res) => {
						if (err) next(err);
						else {
							this.log(
								"INFO",
								`Migration 1 (user). Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
							);

							next();
						}
					});
				}
			],
			(err, response) => {
				if (err) {
					reject(new Error(err));
				} else {
					resolve(response);
				}
			}
		);
	});
}
