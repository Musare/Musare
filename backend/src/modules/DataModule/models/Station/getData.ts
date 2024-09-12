// import { StationSchemaOptions } from "./schema";

// export default {
// 	enabled: true,
// 	specialProperties: {
// 		owner: [
// 			{
// 				$addFields: {
// 					ownerOID: {
// 						$convert: {
// 							input: "$owner",
// 							to: "objectId",
// 							onError: "unknown",
// 							onNull: "unknown"
// 						}
// 					}
// 				}
// 			},
// 			{
// 				$lookup: {
// 					from: "users",
// 					localField: "ownerOID",
// 					foreignField: "_id",
// 					as: "ownerUser"
// 				}
// 			},
// 			{
// 				$unwind: {
// 					path: "$ownerUser",
// 					preserveNullAndEmptyArrays: true
// 				}
// 			},
// 			{
// 				$addFields: {
// 					ownerUsername: {
// 						$cond: [
// 							{ $eq: [{ $type: "$owner" }, "string"] },
// 							{
// 								$ifNull: ["$ownerUser.username", "unknown"]
// 							},
// 							"none"
// 						]
// 					}
// 				}
// 			},
// 			{
// 				$project: {
// 					ownerOID: 0,
// 					ownerUser: 0
// 				}
// 			}
// 		]
// 	},
// 	specialQueries: {
// 		owner: newQuery => ({
// 			$or: [newQuery, { ownerUsername: newQuery.owner }]
// 		})
// 	}
// } as StationSchemaOptions["getData"];
