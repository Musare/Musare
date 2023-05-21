import async from "async";

/**
 * Migration 14
 *
 * Migration for removing some data from stations
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const stationModel = await MigrationModule.runJob("GET_MODEL", { modelName: "station" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					this.log("INFO", `Migration 14. Finding stations with document version 5.`);
					stationModel.find({ documentVersion: 5 }, (err, stations) => {
						if (err) next(err);
						else {
							async.eachLimit(
								stations.map(station => station._doc),
								1,
								(station, next) => {
									const { queue, currentSong } = station;

									if (currentSong && currentSong.likes) {
										delete currentSong.likes;
										delete currentSong.dislikes;
									}

									queue.forEach(song => {
										delete song.likes;
										delete song.dislikes;
									});

									stationModel.updateOne(
										{ _id: station._id },
										{
											$set: {
												documentVersion: 6,
												queue,
												currentSong
											}
										},
										next
									);
								},
								err => {
									this.log("INFO", `Migration 14. Stations found: ${stations.length}.`);
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
