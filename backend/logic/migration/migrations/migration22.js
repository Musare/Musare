import async from "async";

/**
 * Migration 22
 *
 * Migration to fix issues in a previous migration (12), where report categories were not turned into lowercase
 *
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const reportModel = await MigrationModule.runJob("GET_MODEL", { modelName: "report" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					this.log("INFO", `Migration 22. Finding reports with document version 5.`);
					reportModel.find({ documentVersion: 5 }, (err, reports) => {
						if (err) next(err);
						else {
							async.eachLimit(
								reports.map(reporti => reporti._doc),
								1,
								(reporti, next) => {
									const issues = reporti.issues.map(issue => ({
										...issue,
										category: issue.category.toLowerCase()
									}));

									reportModel.updateOne(
										{ _id: reporti._id },
										{
											$set: {
												documentVersion: 6,
												issues
											},
											$unset: {
												description: ""
											}
										},
										next
									);
								},
								err => {
									if (err) next(err);
									else {
										this.log("INFO", `Migration 22. Reports found: ${reports.length}.`);
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
