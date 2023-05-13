import async from "async";

/**
 * Migration 8
 *
 * Migration for replacing songId with youtubeId whereever it is used, and using songId for any song's _id uses
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const activityModel = await MigrationModule.runJob("GET_MODEL", { modelName: "activity" }, this);
	const playlistModel = await MigrationModule.runJob("GET_MODEL", { modelName: "playlist" }, this);
	const reportModel = await MigrationModule.runJob("GET_MODEL", { modelName: "report" }, this);
	const songModel = await MigrationModule.runJob("GET_MODEL", { modelName: "song" }, this);
	const stationModel = await MigrationModule.runJob("GET_MODEL", { modelName: "station" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					this.log("INFO", `Migration 8. Finding activities with document version 1.`);
					activityModel.find({ documentVersion: 1 }, (err, activities) => {
						if (err) next(err);
						else {
							async.eachLimit(
								activities.map(activity => activity._doc),
								1,
								(activity, next) => {
									const { payload } = activity;
									if (payload.songId) {
										payload.youtubeId = payload.songId;
										delete payload.songId;
									}
									if (payload.message)
										payload.message = payload.message
											.replaceAll("<songId", "<youtubeId")
											.replaceAll("</songId", "</youtubeId");

									activityModel.updateOne(
										{ _id: activity._id },
										{ $set: { payload, documentVersion: 2 } },
										next
									);
								},
								err => {
									if (err) next(err);
									else {
										this.log("INFO", `Migration 8. Activities found: ${activities.length}.`);
										next();
									}
								}
							);
						}
					});
				},

				next => {
					this.log("INFO", `Migration 8. Finding playlists with document version 2.`);
					playlistModel.find({ documentVersion: 2 }, (err, playlists) => {
						if (err) next(err);
						else {
							async.eachLimit(
								playlists.map(playlist => playlist._doc),
								1,
								(playlist, next) => {
									const songs = playlist.songs.map(song => {
										song.youtubeId = song.songId;
										delete song.songId;
										return song;
									});

									playlistModel.updateOne({ _id: playlist._id }, { $set: { songs } }, next);
								},
								err => {
									if (err) next(err);
									else {
										playlistModel.updateMany(
											{ documentVersion: 2 },
											{ $set: { documentVersion: 3 } },
											(err, res) => {
												if (err) next(err);
												else {
													this.log(
														"INFO",
														`Migration 8. Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
													);
													next();
												}
											}
										);
									}
								}
							);
						}
					});
				},

				next => {
					this.log("INFO", `Migration 8. Finding reports with document version 1.`);
					reportModel.updateMany(
						{ documentVersion: 1 },
						{ $set: { documentVersion: 2 }, $rename: { "song.songId": "song.youtubeId" } },
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 8. Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
								);
								next();
							}
						}
					);
				},

				next => {
					this.log("INFO", `Migration 8. Dropping indexes.`);
					songModel.collection.dropIndexes((err, res) => {
						if (err) next(err);
						else {
							this.log("INFO", `Migration 8. Dropped indexes: ${res}.`);
							next();
						}
					});
				},

				next => {
					this.log("INFO", `Migration 8. Finding spmgs with document version 3.`);
					songModel.updateMany(
						{ documentVersion: 3 },
						{ $set: { documentVersion: 4 }, $rename: { songId: "youtubeId" } },
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 8. Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
								);
								next();
							}
						}
					);
				},

				next => {
					this.log("INFO", `Migration 8. Finding stations with document version 3.`);
					stationModel.find({ documentVersion: 4 }, (err, stations) => {
						if (err) next(err);
						else {
							async.eachLimit(
								stations.map(station => station._doc),
								1,
								(station, next) => {
									const queue = station.queue.map(song => {
										song.youtubeId = song.songId;
										delete song.songId;
										return song;
									});

									stationModel.updateOne({ _id: station._id }, { $set: { queue } }, next);
								},
								err => {
									if (err) next(err);
									else {
										stationModel.updateMany(
											{ documentVersion: 4, currentSong: { $ne: null } },
											{
												$set: { documentVersion: 5 },
												$rename: { "currentSong.songId": "currentSong.youtubeId" }
											},
											(err, res) => {
												if (err) next(err);
												else {
													this.log(
														"INFO",
														`Migration 8. Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
													);
													stationModel.updateMany(
														{ documentVersion: 4, currentSong: null },
														{
															$set: { documentVersion: 5 }
														},
														(err, res) => {
															if (err) next(err);
															else {
																this.log(
																	"INFO",
																	`Migration 8. Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
																);
																next();
															}
														}
													);
												}
											}
										);
									}
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
