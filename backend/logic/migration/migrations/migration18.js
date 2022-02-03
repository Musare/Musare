import async from "async";

/**
 * Migration 18
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
					this.log("INFO", `Migration 18. Finding hidden songs with document version 6.`);
					songModel.updateMany(
						{ documentVersion: 6, status: { $in: ["hidden"] } },
						{
							$push: { tags: "hidden" },
							$set: { documentVersion: 7, verified: false },
							$unset: { status: "" }
						},
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 18 (hidden songs). Matched: ${res.matchedCount}, modified: ${res.modifiedCount}, ok: ${res.ok}.`
								);

								next();
							}
						}
					);
				},

				next => {
					this.log("INFO", `Migration 18. Finding unverified songs with document version 6.`);
					songModel.updateMany(
						{ documentVersion: 6, status: { $in: ["unverified"] } },
						{ $set: { documentVersion: 7, verified: false }, $unset: { status: "" } },
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 18 (unverified songs). Matched: ${res.matchedCount}, modified: ${res.modifiedCount}, ok: ${res.ok}.`
								);

								next();
							}
						}
					);
				},

				next => {
					this.log("INFO", `Migration 18. Finding verified songs with document version 6.`);
					songModel.updateMany(
						{ documentVersion: 6, status: "verified" },
						{ $set: { documentVersion: 7, verified: true }, $unset: { status: "" } },
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 18 (verified songs). Matched: ${res.matchedCount}, modified: ${res.modifiedCount}, ok: ${res.ok}.`
								);

								next();
							}
						}
					);
				},

				next => {
					playlistModel.updateMany({ documentVersion: 5 }, { $set: { documentVersion: 6 } }, (err, res) => {
						if (err) next(err);
						else {
							this.log(
								"INFO",
								`Migration 18 (playlist). Matched: ${res.matchedCount}, modified: ${res.modifiedCount}, ok: ${res.ok}.`
							);

							next();
						}
					});
				},

				next => {
					stationModel.updateMany({ documentVersion: 6 }, { $set: { documentVersion: 7 } }, (err, res) => {
						if (err) next(err);
						else {
							this.log(
								"INFO",
								`Migration 18 (station). Matched: ${res.matchedCount}, modified: ${res.modifiedCount}, ok: ${res.ok}.`
							);

							next();
						}
					});
				},

				next => {
					this.log("INFO", `Migration 18. Updating playlist songs and queue songs.`);
					songModel.find({ documentVersion: 7 }, (err, songs) => {
						if (err) next(err);
						else {
							async.eachLimit(
								songs.map(song => song._doc),
								1,
								(song, next) => {
									const {
										_id,
										youtubeId,
										title,
										artists,
										thumbnail,
										duration,
										skipDuration,
										verified
									} = song;
									const trimmedSong = {
										_id,
										youtubeId,
										title,
										artists,
										thumbnail,
										duration: +duration,
										skipDuration: +skipDuration,
										verified
									};
									async.waterfall(
										[
											next => {
												playlistModel.updateMany(
													{ "songs._id": song._id, documentVersion: 6 },
													{ $set: { "songs.$": trimmedSong } },
													next
												);
											},

											(res, next) => {
												stationModel.updateMany(
													{ "queue._id": song._id, documentVersion: 7 },
													{ $set: { "queue.$": trimmedSong } },
													next
												);
											},

											(res, next) => {
												stationModel.updateMany(
													{ "currentSong._id": song._id, documentVersion: 7 },
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
