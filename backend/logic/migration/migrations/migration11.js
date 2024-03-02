import async from "async";

/**
 * Migration 11
 *
 * Migration for changing language of verifying a song from 'accepted' to 'verified' for songs
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const songModel = await MigrationModule.runJob("GET_MODEL", { modelName: "song" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					this.log("INFO", `Migration 11. Finding songs with document version 4.`);
					songModel.find({ documentVersion: 4 }, (err, songs) => {
						if (err) next(err);
						else {
							async.eachLimit(
								songs.map(songi => songi._doc),
								1,
								(songi, next) =>
									songModel.updateOne(
										{ _id: songi._id },
										{
											$set: {
												verifiedBy: songi.acceptedBy,
												verifiedAt: songi.acceptedAt,
												documentVersion: 5
											},
											$unset: {
												acceptedBy: "",
												acceptedAt: ""
											}
										},
										next
									),
								err => {
									if (err) next(err);
									else {
										this.log("INFO", `Migration 11. Songs found: ${songs.length}.`);
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
