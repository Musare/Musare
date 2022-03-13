import async from "async";
import mongoose from "mongoose";

/**
 * Migration 20
 *
 * Migration for station overhaul (WIP)
 *
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const stationModel = await MigrationModule.runJob("GET_MODEL", { modelName: "station" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					this.log("INFO", `Migration 20. Finding stations with document version 7.`);
					stationModel.find({ documentVersion: 7, excludedPlaylists: { $exists: true } }, (err, stations) => {
						if (err) next(err);
						else {
							async.eachLimit(
								stations.map(station => station._doc),
								1,
								(station, next) => {
									stationModel.updateOne(
										{ _id: station._id },
										{
											$unset: { excludedPlaylists: "" },
											$set: {
												blacklist: station.excludedPlaylists.map(playlist =>
													mongoose.Types.ObjectId(playlist)
												) /* ,
												documentVersion: 8 */
											}
										},
										next
									);
								},
								err => {
									this.log("INFO", `Migration 20. Stations found: ${stations.length}.`);
									next(err);
								}
							);
						}
					});
					stationModel.updateMany(
						{ documentVersion: 7 },
						{ $set: { "requests.enabled": true } },
						(err, res) => {
							this.log("INFO", `Migration 20. Stations found: ${res.modifiedCount}.`);
							next(err);
						}
					);
				}
			],
			err => {
				if (err) reject(new Error(err));
				else resolve();
			}
		);
	});
}
