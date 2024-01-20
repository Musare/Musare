import { SchemaOptions } from "mongoose";
import CacheModule from "@/modules/CacheModule";
import getData from "./getData";
import { UserSchema } from "./schema";

export default {
	documentVersion: 4,
	eventListeners: {
		"model.users.updated": async doc => {
			CacheModule.removeMany([
				`user-permissions.${doc._id}`,
				`model-permissions.*.user.${doc._id}`
			]);
		},
		"model.users.deleted": async oldDoc => {
			CacheModule.removeMany([
				`user-permissions.${oldDoc._id}`,
				`model-permissions.*.user.${oldDoc._id}`
			]);
		}
	},
	getData
} as SchemaOptions<UserSchema>;
