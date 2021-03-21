import async from "async";

/**
 * Migration 3
 *
 * Clean up station object from playlist2 property (replacing old playlist property with playlist2 property), adding a playMode property and removing genres/blacklisted genres
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
					this.log("INFO", `Migration 3. Finding stations with document version 2.`);
					stationModel.find({ documentVersion: 2 }, (err, stations) => {
						this.log("INFO", `Migration 3. Found ${stations.length} stations with document version 2.`);

						next(
							null,
							stations.map(station => station._doc)
						);
					});
				},

				(stations, next) => {
					async.eachLimit(
						stations,
						1,
						(station, next) => {
							this.log("INFO", `Migration 3. Updating station ${station._id}.`);
							stationModel.updateOne(
								{ _id: station._id },
								{
									$set: {
										playlist: station.playlist2,
										playMode: "random",
										documentVersion: 3
									},
									$unset: {
										genres: "",
										blacklistedGenres: "",
										playlist2: "",
										privatePlaylist: ""
									}
								},
								(err, res) => {
									if (err) next(err);
									else {
										this.log(
											"INFO",
											`Migration 3. Updating station ${station._id} done. Matched: ${res.n}, modified: ${res.nModified}, ok: ${res.ok}.`
										);
										next();
									}
								}
							);
							// next();
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
