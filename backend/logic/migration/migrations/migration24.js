/**
 * Migration 24
 *
 * Migration for setting station skip vote threshold
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const stationModel = await MigrationModule.runJob("GET_MODEL", { modelName: "station" }, this);

	return new Promise((resolve, reject) => {
		this.log("INFO", `Migration 24. Updating stations with document version 8.`);
		stationModel.updateMany(
			{ documentVersion: 8 },
			{
				$set: {
					documentVersion: 9,
					skipVoteThreshold: 100
				}
			},
			err => {
				if (err) reject(new Error(err));
				else resolve();
			}
		);
	});
}
