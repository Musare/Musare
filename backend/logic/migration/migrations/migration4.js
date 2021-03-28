import async from "async";

/**
 * Migration 4
 *
 * Migration for song merging. Merges queueSongs into songs database, and adds verified property to all songs.
 *
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const queueSongModel = await MigrationModule.runJob("GET_MODEL", { modelName: "queueSong" }, this);
	const songModel = await MigrationModule.runJob("GET_MODEL", { modelName: "song" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					this.log("INFO", `Migration 4. Finding songs with document version 1.`);
					songModel.updateMany(
						{ documentVersion: 1 },
						{ $set: { documentVersion: 2, verified: true } },
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 4 (song). Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
								);

								next();
							}
						}
					);
				},

				next => {
					this.log("INFO", `Migration 4. Finding queue songs.`);
					queueSongModel.find({}, next);
				},

				(queueSongs, next) => {
					this.log("INFO", `Migration 4. Found ${queueSongs.length} queue songs.`);
					async.eachLimit(
						queueSongs,
						1,
						(_queueSong, next) => {
							const queueSong = JSON.parse(JSON.stringify(_queueSong));

							songModel.findOne({ songId: queueSong.songId }, (err, song) => {
								if (err) next(err);
								else if (song) {
									this.log(
										"INFO",
										`Migration 4. Skipping creating song for queue song ${queueSong.songId} (${queueSong._id}) since it already exists.`
									);
									next(null, song);
								} else {
									this.log(
										"INFO",
										`Migration 4. Creating song for queue song ${queueSong.songId} (${queueSong._id}).`
									);
									queueSong.verified = false;
									queueSong.documentVersion = 2;
									delete queueSong._id;
									songModel.create(queueSong, next);
								}
							});
						},
						err => {
							if (err) next(err);
							else {
								this.log("INFO", `Migration 4. Deleting queue songs.`);
								queueSongModel.deleteMany({}, (err, res) => {
									if (err) next(err);
									else {
										this.log(
											"INFO",
											`Migration 4 (queueSong). Matched: ${res.n}, deleted: ${res.deletedCount}, ok: ${res.ok}.`
										);

										next();
									}
								});
							}
						}
					);
				}
			],
			err => {
				if (err) {
					reject(new Error(err));
				} else {
					resolve();
				}
			}
		);
	});
}
