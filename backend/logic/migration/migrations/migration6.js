import async from "async";

/**
 * Migration 6
 *
 * Migration for adding activityWatch preference to user object
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const userModel = await MigrationModule.runJob("GET_MODEL", { modelName: "user" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					this.log("INFO", `Migration 6. Finding users with document version 1.`);
					userModel.updateMany(
						{ documentVersion: 1 },
						{ $set: { documentVersion: 2, "preferences.activityWatch": false } },
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 6. Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
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
