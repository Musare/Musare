import async from "async";

/**
 * Migration 7
 *
 * Migration for adding anonymous song requests preference to user object
 *
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const userModel = await MigrationModule.runJob("GET_MODEL", { modelName: "user" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					this.log("INFO", `Migration 7. Finding users with document version 2.`);
					userModel.updateMany(
						{ documentVersion: 2 },
						{ $set: { documentVersion: 3, "preferences.anonymousSongRequests": false } },
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 7. Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
								);

								next();
							}
						}
					);
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
