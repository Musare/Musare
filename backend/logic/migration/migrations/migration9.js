import async from "async";

/**
 * Migration 9
 *
 * Migration for news
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
					// return next("BLOCKED");
					this.log("INFO", `Migration 9. Finding news with document version 1.`);
					newsModel.find({ documentVersion: 1 }, (err, news) => {
						if (err) next(err);
						else {
							async.eachLimit(
								news.map(newi => newi._doc),
								1,
								(newi, next) => {
									newi.markdown = `# ${newi.title}\n\n`;
									newi.markdown += `## ${newi.description}\n\n`;

									if (newi.bugs) {
										newi.markdown += `**Bugs:**\n\n${newi.bugs.join(", ")}\n\n`;
									}

									if (newi.features) {
										newi.markdown += `**Features:**\n\n${newi.features.join(", ")}\n\n`;
									}

									if (newi.improvements) {
										newi.markdown += `**Improvements:**\n\n${newi.improvements.join(", ")}\n\n`;
									}

									if (newi.upcoming) {
										newi.markdown += `**Upcoming:**\n\n${newi.upcoming.join(", ")}\n`;
									}

									newsModel.updateOne(
										{ _id: newi._id },
										{
											$set: {
												markdown: newi.markdown,
												status: "published",
												documentVersion: 2
											},
											$unset: {
												description: "",
												bugs: "",
												features: "",
												improvements: "",
												upcoming: ""
											}
										},
										next
									);
								},
								err => {
									if (err) next(err);
									else {
										this.log("INFO", `Migration 9. News found: ${news.length}.`);
										next();
									}
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
