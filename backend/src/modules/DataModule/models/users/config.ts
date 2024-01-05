import CacheModule from "@/modules/CacheModule";

export default {
	documentVersion: 4,
	eventListeners: {
		"model.users.updated": ({ doc }) => {
			CacheModule.removeMany([
				`user-permissions.${doc._id}`,
				`model-permissions.*.user.${doc._id}`
			]);
		},
		"model.users.deleted": ({ oldDoc }) => {
			CacheModule.removeMany([
				`user-permissions.${oldDoc._id}`,
				`model-permissions.*.user.${oldDoc._id}`
			]);
		}
	}
};
