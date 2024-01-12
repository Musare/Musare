import { HydratedDocument } from "mongoose";
import CacheModule from "@/modules/CacheModule";
import getData from "./getData";
import { UserModel } from "./schema";

export default {
	documentVersion: 4,
	eventListeners: {
		"model.users.updated": ({
			doc
		}: {
			doc: HydratedDocument<UserModel>;
		}) => {
			CacheModule.removeMany([
				`user-permissions.${doc._id}`,
				`model-permissions.*.user.${doc._id}`
			]);
		},
		"model.users.deleted": ({
			oldDoc
		}: {
			oldDoc: HydratedDocument<UserModel>;
		}) => {
			CacheModule.removeMany([
				`user-permissions.${oldDoc._id}`,
				`model-permissions.*.user.${oldDoc._id}`
			]);
		}
	},
	getData
};
