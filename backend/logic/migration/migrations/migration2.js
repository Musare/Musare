import async from "async";

/**
 * Migration 2
 *
 * Updates the document version 1 stations to add the includedPlaylists and excludedPlaylists properties, and to create a station playlist and link that playlist with the playlist2 property.
 *
 * @param {object} MigrationModule - the MigrationModule
 * @returns {Promise} - returns promise
 */
export default async function migrate(MigrationModule) {
	const stationModel = await MigrationModule.runJob("GET_MODEL", { modelName: "station" }, this);
	const playlistModel = await MigrationModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

	return new Promise((resolve, reject) => {
		async.waterfall(
			[
				next => {
					this.log("INFO", `Migration 2. Finding stations with document version 1.`);
					stationModel.find({ documentVersion: 1 }, (err, stations) => {
						this.log("INFO", `Migration 2. Found ${stations.length} stations with document version 1.`);

						next(null, stations);
					});
				},

				(stations, next) => {
					async.eachLimit(
						stations,
						1,
						(station, next) => {
							this.log("INFO", `Migration 2. Creating station playlist for station ${station._id}.`);
							playlistModel.create(
								{
									isUserModifiable: false,
									displayName: `Station - ${station.displayName}`,
									songs: [],
									createdBy: station.type === "official" ? "Musare" : station.createdBy,
									createdFor: `${station._id}`,
									createdAt: Date.now(),
									type: "station",
									documentVersion: 1
								},

								(err, playlist2) => {
									if (err) next(err);
									else {
										this.log("INFO", `Migration 2. Updating station ${station._id}.`);
										stationModel.updateOne(
											{ _id: station._id },
											{
												$set: {
													playlist2: playlist2._id,
													includedPlaylists: [],
													excludedPlaylists: []
												}
											},
											(err, res) => {
												if (err) next(err);
												else {
													this.log(
														"INFO",
														`Migration 2. Updating station ${station._id} done. Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
													);
												}
											}
										);
									}
								}
							);
						},
						next
					);
				}
			],
			(err, response) => {
				if (err) {
					reject(new Error(err));
				} else {
					resolve(response);
				}
			}
		);
	});
}
