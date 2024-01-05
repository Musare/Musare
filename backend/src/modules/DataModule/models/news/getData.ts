export default {
	enabled: true,
	specialProperties: {
		createdBy: [
			{
				$addFields: {
					createdByOID: {
						$convert: {
							input: "$createdBy",
							to: "objectId",
							onError: "unknown",
							onNull: "unknown"
						}
					}
				}
			},
			{
				$lookup: {
					from: "users",
					localField: "createdByOID",
					foreignField: "_id",
					as: "createdByUser"
				}
			},
			{
				$unwind: {
					path: "$createdByUser",
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$addFields: {
					createdByUsername: {
						$ifNull: ["$createdByUser.username", "unknown"]
					}
				}
			},
			{
				$project: {
					createdByOID: 0,
					createdByUser: 0
				}
			}
		]
	},
	specialQueries: {
		createdBy: newQuery => ({
			$or: [newQuery, { createdByUsername: newQuery.createdBy }]
		})
	}
};
