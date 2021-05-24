import async from "async";

/**
 * Migration 10
 *
 * Migration for changes in how the order of songs in a playlist is handled
 *
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const playlistModel = await MigrationModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					this.log("INFO", `Migration 10. Finding playlists with document version 3.`);
					playlistModel.find({ documentVersion: 3 }, (err, playlists) => {
						if (err) next(err);
						else {
							async.eachLimit(
								playlists.map(playlisti => playlisti._doc),
								1,
								(playlisti, next) => {
									// sort playlists by the position property
									playlisti.songs.sort((song1, song2) => song1.position - song2.position);

									// delete the position property for each song
									playlisti.songs.forEach(song => delete song.position);

									// update the database
									playlistModel.updateOne(
										{ _id: playlisti._id },
										{
											$set: {
												songs: playlisti.songs,
												documentVersion: 4
											}
										},
										next
									);
								},
								err => {
									if (err) next(err);
									else {
										this.log("INFO", `Migration 10. Playlists found: ${playlists.length}.`);
										next();
									}
								}
							);
						}
					});
				}
			],
			err => {
				if (err) reject(new Error(err));
				else resolve();
			}
		);
	});
}
