import async from "async";

/**
 * Migration 23
 *
 * Migration for renaming default user role from default to user
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
					this.log("INFO", `Migration 23. Finding users with document version 3.`);
					userModel.find({ documentVersion: 3 }, (err, users) => {
						if (err) next(err);
						else {
							async.eachLimit(
								users.map(user => user._doc),
								1,
								(user, next) => {
									userModel.updateOne(
										{ _id: user._id },
										{
											$set: {
												role: user.role === "default" ? "user" : user.role,
												documentVersion: 4
											}
										},
										next
									);
								},
								err => {
									this.log("INFO", `Migration 23. Users found: ${users.length}.`);
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
