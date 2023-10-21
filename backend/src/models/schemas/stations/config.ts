import isDj from "@/models/permissions/isDj";
import isPublic from "@/models/permissions/isPublic";
import isUnlisted from "@/models/permissions/isUnlisted";
import isLoggedIn from "@/models/permissions/isLoggedIn";
import isOwner from "@/models/permissions/isOwner";
import getData from "./getData";

export default {
	documentVersion: 10,
	jobConfig: {
		create: {
			hasPermission: isLoggedIn
		},
		findById: {
			hasPermission: [isOwner, isDj, isPublic, isUnlisted]
		},
		updateById: {
			hasPermission: [isOwner, isDj]
		},
		deleteById: {
			hasPermission: [isOwner, isDj]
		}
	},
	getData
};
