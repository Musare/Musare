import async from "async";

/**
 * Migration 21
 *
 * Migration for song ratings
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const songModel = await MigrationModule.runJob("GET_MODEL", { modelName: "song" }, this);
	const playlistModel = await MigrationModule.runJob("GET_MODEL", { modelName: "playlist" }, this);
	const ratingsModel = await MigrationModule.runJob("GET_MODEL", { modelName: "ratings" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					this.log("INFO", `Migration 21. Finding songs with document version 8.`);
					songModel.find({ documentVersion: 8 }, { youtubeId: true }, next);
				},

				(songs, next) => {
					async.eachLimit(
						songs.map(song => song.youtubeId),
						2,
						(youtubeId, next) => {
							async.waterfall(
								[
									next => {
										playlistModel.countDocuments(
											{ songs: { $elemMatch: { youtubeId } }, type: "user-liked" },
											(err, likes) => {
												if (err) return next(err);
												return next(null, likes);
											}
										);
									},

									(likes, next) => {
										playlistModel.countDocuments(
											{ songs: { $elemMatch: { youtubeId } }, type: "user-disliked" },
											(err, dislikes) => {
												if (err) return next(err);
												return next(err, { likes, dislikes });
											}
										);
									},

									({ likes, dislikes }, next) => {
										ratingsModel.updateOne(
											{ youtubeId },
											{
												$set: {
													likes,
													dislikes,
													documentVersion: 1
												}
											},
											{ upsert: true },
											next
										);
									}
								],
								next
							);
						},
						err => {
							next(err);
						}
					);
				},

				next => {
					songModel.updateMany(
						{ documentVersion: 8 },
						{
							$set: { documentVersion: 9 },
							$unset: { likes: true, dislikes: true }
						},
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 21 (songs). Matched: ${res.matchedCount}, modified: ${res.modifiedCount}, ok: ${res.ok}.`
								);

								next();
							}
						}
					);
				}
			],
			err => {
				if (err) reject(new Error(err));
				else resolve();
			}
		);
	});
}
