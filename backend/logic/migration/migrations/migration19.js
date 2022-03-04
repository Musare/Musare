import async from "async";

/**
 * Migration 19
 *
 * Migration for news showToNewUsers property.
 *
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const newsModel = await MigrationModule.runJob("GET_MODEL", { modelName: "news" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					this.log("INFO", `Migration 19. Finding news with version 2.`);
					newsModel.updateMany(
						{ documentVersion: 2 },
						{
							$set: { documentVersion: 3, showToNewUsers: false },
						},
						(err, res) => {
							if (err) next(err);
							else {
								this.log(
									"INFO",
									`Migration 19. Matched: ${res.matchedCount}, modified: ${res.modifiedCount}, ok: ${res.ok}.`
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
