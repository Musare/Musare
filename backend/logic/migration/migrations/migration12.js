import async from "async";

/**
 * Migration 12
 *
 * Migration for updated style of reports
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
					this.log("INFO", `Migration 12. Finding reports with document version 2.`);
					reportModel.find({ documentVersion: 2 }, (err, reports) => {
						if (err) next(err);
						else {
							async.eachLimit(
								reports.map(reporti => reporti._doc),
								1,
								(reporti, next) => {
									const issues = [];

									if (reporti.description !== "")
										issues.push({ category: "custom", info: reporti.description });

									reporti.issues.forEach(category =>
										category.reasons.forEach(info => issues.push({ category: category.name, info }))
									);

									reportModel.updateOne(
										{ _id: reporti._id },
										{
											$set: {
												documentVersion: 4,
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
										this.log("INFO", `Migration 12. Reports found: ${reports.length}.`);
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
