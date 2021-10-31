import async from "async";

/**
 * Migration 13
 *
 * Migration for allowing titles, descriptions and individual resolving for report issues
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
					this.log("INFO", `Migration 13. Finding reports with document version 4.`);
					reportModel.find({ documentVersion: 4 }, (err, reports) => {
						if (err) next(err);
						else {
							async.eachLimit(
								reports.map(reporti => reporti._doc),
								1,
								(reporti, next) => {
									const { issues } = reporti;

									issues.forEach(issue => {
										issue.title = issue.info;
										issue.resolved = reporti.resolved;
										delete issue.info;
									});

									reportModel.updateOne(
										{ _id: reporti._id },
										{
											$set: {
												documentVersion: 5,
												issues
											}
										},
										next
									);
								},
								err => {
									this.log("INFO", `Migration 13. Reports found: ${reports.length}.`);
									next(err);
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
