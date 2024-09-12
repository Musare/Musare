// import { SchemaOptions } from "mongoose";
// import CacheModule from "@/modules/CacheModule";
// import getData from "./getData";
// import { UserSchema } from "./schema";
// import ModelUpdatedEvent from "../../ModelUpdatedEvent";
// import ModelDeletedEvent from "../../ModelDeletedEvent";

// export default {
// 	documentVersion: 4,
// 	eventListeners: {
// 		"data.users.updated.*": async (event: ModelUpdatedEvent) => {
// 			const { doc } = event.getData();
// 			CacheModule.removeMany([
// 				`user-permissions.${doc._id}`,
// 				`model-permissions.*.user.${doc._id}`
// 			]);
// 		},
// 		"data.users.deleted.*": async (event: ModelDeletedEvent) => {
// 			const { oldDoc } = event.getData();
// 			CacheModule.removeMany([
// 				`user-permissions.${oldDoc._id}`,
// 				`model-permissions.*.user.${oldDoc._id}`
// 			]);
// 		}
// 	},
// 	getData
// } as SchemaOptions<UserSchema>;
