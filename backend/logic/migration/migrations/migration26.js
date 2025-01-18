/**
 * Migration 26
 *
 * Migration for setting new user preferences to default
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const userModel = await MigrationModule.runJob("GET_MODEL", { modelName: "user" }, this);

	return new Promise((resolve, reject) => {
		this.log("INFO", `Migration 26. Updating users with document version 4.`);
		userModel.updateMany(
			{ documentVersion: 4 },
			{
				$set: {
					documentVersion: 5,
					"preferences.defaultStationPrivacy": "private",
					"preferences.defaultPlaylistPrivacy": "public"
				}
			},
			(err, res) => {
				if (err) reject(new Error(err));
				else {
					this.log(
						"INFO",
						`Migration 26. Matched: ${res.matchedCount}, modified: ${res.modifiedCount}, ok: ${res.ok}.`
					);

					resolve();
				}
			}
		);
	});
}
