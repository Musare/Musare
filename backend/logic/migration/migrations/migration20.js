import async from "async";
import mongoose from "mongoose";

/**
 * Migration 20
 *
 * Migration for station overhaul and preventing migration18 from always running
 *
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const stationModel = await MigrationModule.runJob("GET_MODEL", { modelName: "station" }, this);
	const songModel = await MigrationModule.runJob("GET_MODEL", { modelName: "song" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					this.log("INFO", `Migration 20. Finding stations with document version 7.`);
					stationModel.find(
						{
							documentVersion: 7
						},
						(err, stations) => {
							if (err) next(err);
							else {
								async.eachLimit(
									stations.map(station => station._doc),
									1,
									(station, next) => {
										stationModel.updateOne(
											{ _id: station._id },
											{
												$unset: {
													includedPlaylists: "",
													excludedPlaylists: "",
													playMode: "",
													partyMode: "",
													locked: ""
												},
												$set: {
													queue: station.queue.map(song => {
														if (!song.requestedAt) song.requestedAt = Date.now();
														return song;
													}),
													autofill: {
														enabled: !station.partyMode,
														playlists: station.includedPlaylists.map(playlist =>
															mongoose.Types.ObjectId(playlist)
														),
														limit: 30,
														mode: station.playMode ? station.playMode : "random"
													},
													requests: {
														enabled: !!station.partyMode,
														access:
															station.locked || station.type === "official"
																? "owner"
																: "user",
														limit: 5
													},
													blacklist: station.excludedPlaylists.map(playlist =>
														mongoose.Types.ObjectId(playlist)
													),
													documentVersion: 8
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
						}
					);
				},

				next => {
					songModel.updateMany({ documentVersion: 7 }, { $set: { documentVersion: 8 } }, (err, res) => {
						if (err) next(err);
						else {
							this.log(
								"INFO",
								`Migration 20 (songs). Matched: ${res.matchedCount}, modified: ${res.modifiedCount}, ok: ${res.ok}.`
							);

							next();
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
