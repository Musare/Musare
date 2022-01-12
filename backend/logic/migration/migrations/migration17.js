import async from "async";

/**
 * Migration 17
 *
 * Migration for songs to add tags property
 *
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const songModel = await MigrationModule.runJob("GET_MODEL", { modelName: "song" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					this.log("INFO", `Migration 17. Finding songs with document version 5.`);
					songModel.updateMany(
						{ documentVersion: 5 },
						{ $set: { documentVersion: 6, "tags": [] } },
						(err, res) => {
							if (err) next(err);
							else {
								console.log(res);
								this.log(
									"INFO",
									`Migration 17. Matched: ${res.matchedCount}, modified: ${res.modifiedCount}.`
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
