import async from "async";

/**
 * Migration 15
 *
 * Migration for setting user name to username if not set
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const userModel = await MigrationModule.runJob("GET_MODEL", { modelName: "user" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					this.log("INFO", `Migration 15. Finding users with document version 3.`);
					userModel.find({ documentVersion: 3, name: { $in: [null, ""] } }, (err, users) => {
						if (err) next(err);
						else {
							async.eachLimit(
								users.map(user => user._doc),
								1,
								(user, next) => {
									userModel.updateOne({ _id: user._id }, { $set: { name: user.username } }, next);
								},
								err => {
									this.log("INFO", `Migration 15. Users found: ${users.length}.`);
									next(err);
								}
							);
						}
					});
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
