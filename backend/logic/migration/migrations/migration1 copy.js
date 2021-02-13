import async from "async";

/**
 * Migration 2
 *
 *
 *
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const stationModel = await MigrationModule.runJob("GET_MODEL", { modelName: "station" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					stationModel.updateMany(
						{ documentVersion: 1 },
						{ $set: { documentVersion: 2, includedPlaylists: [], excludedPlaylists: [] } },
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 2 (station). Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
								);

								next();
							}
						}
					);
				}
			],
			(err, response) => {
				if (err) {
					reject(new Error(err));
				} else {
					resolve(response);
				}
			}
		);
	});
}
