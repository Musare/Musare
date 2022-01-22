import async from "async";

/**
 * Migration 16
 *
 * Migration for playlists to remove isUserModifiable
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
					this.log("INFO", `Migration 16. Finding playlists with document version 4.`);
					playlistModel.find({ documentVersion: 4 }, (err, playlists) => {
						if (err) next(err);
						else {
							async.eachLimit(
								playlists.map(playlisti => playlisti._doc),
								1,
								(playlisti, next) => {
									// set liked/disliked playlist to new type
									if (playlisti.type === "user" && playlisti.displayName === "Liked Songs")
										playlisti.type = "user-liked";
									else if (playlisti.type === "user" && playlisti.displayName === "Disliked Songs")
										playlisti.type = "user-disliked";

									// update the database
									playlistModel.updateOne(
										{ _id: playlisti._id },
										{
											$unset: {
												isUserModifiable: ""
											},
											$set: {
												type: playlisti.type,
												documentVersion: 5
											}
										},
										next
									);
								},
								err => {
									if (err) next(err);
									else {
										this.log("INFO", `Migration 16. Playlists found: ${playlists.length}.`);
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
