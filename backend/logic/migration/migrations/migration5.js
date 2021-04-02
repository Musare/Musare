import async from "async";

/**
 * Migration 5
 *
 * Migration for song status property.
 *
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const songModel = await MigrationModule.runJob("GET_MODEL", { modelName: "song" }, this);
	const playlistModel = await MigrationModule.runJob("GET_MODEL", { modelName: "playlist" }, this);
	const stationModel = await MigrationModule.runJob("GET_MODEL", { modelName: "station" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					this.log("INFO", `Migration 5. Finding unverified songs with document version 2.`);
					songModel.updateMany(
						{ documentVersion: 2, verified: false },
						{ $set: { documentVersion: 3, status: "unverified" }, $unset: { verified: "" } },
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 5 (unverified songs). Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
								);

								next();
							}
						}
					);
				},

				next => {
					this.log("INFO", `Migration 5. Finding verified songs with document version 2.`);
					songModel.updateMany(
						{ documentVersion: 2, verified: true },
						{ $set: { documentVersion: 3, status: "verified" }, $unset: { verified: "" } },
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 5 (verified songs). Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
								);

								next();
							}
						}
					);
				},

				next => {
					this.log("INFO", `Migration 5. Updating playlist songs and queue songs.`);
					songModel.find({ documentVersion: 3 }, (err, songs) => {
						if (err) next(err);
						else {
							async.eachLimit(
								songs.map(song => song._doc),
								1,
								(song, next) => {
									// this.log(
									// 	"INFO",
									// 	`Migration 5. Updating playlist songs and queue songs for song ${
									// 		song.songId
									// 	}/${song._id.toString()}.`
									// );

									const { _id, songId, title, artists, thumbnail, duration, status } = song;
									const trimmedSong = {
										_id,
										songId,
										title,
										artists,
										thumbnail,
										duration,
										status
									};
									async.waterfall(
										[
											next => {
												playlistModel.updateMany(
													{ "songs._id": song._id, documentVersion: 1 },
													{ $set: { "songs.$": trimmedSong } },
													next
												);
											},

											(res, next) => {
												stationModel.updateMany(
													{ "queue._id": song._id, documentVersion: 3 },
													{ $set: { "queue.$": trimmedSong } },
													next
												);
											},

											(res, next) => {
												stationModel.updateMany(
													{ "currentSong._id": song._id, documentVersion: 3 },
													{ $set: { currentSong: null } },
													next
												);
											}
										],
										err => {
											next(err);
										}
									);
								},
								err => {
									next(err);
								}
							);
						}
					});
					// songModel.updateMany(
					// 	{ documentVersion: 2, verified: true },
					// 	{ $set: { documentVersion: 3, status: "verified" }, $unset: { verified: "" } },
					// 	(err, res) => {
					// 		if (err) next(err);
					// 		else {
					// 			this.log(
					// 				"INFO",
					// 				`Migration 5 (verified songs). Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
					// 			);

					// 			next();
					// 		}
					// 	}
					// );
				},

				next => {
					playlistModel.updateMany({ documentVersion: 1 }, { $set: { documentVersion: 2 } }, (err, res) => {
						if (err) next(err);
						else {
							this.log(
								"INFO",
								`Migration 5 (playlist). Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
							);

							next();
						}
					});
				},

				next => {
					stationModel.updateMany({ documentVersion: 3 }, { $set: { documentVersion: 4 } }, (err, res) => {
						if (err) next(err);
						else {
							this.log(
								"INFO",
								`Migration 5 (station). Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
							);

							next();
						}
					});
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
