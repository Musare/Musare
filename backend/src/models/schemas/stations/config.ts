import isDj from "../../permissions/isDj";
import isPublic from "../../permissions/isPublic";
import isUnlisted from "../../permissions/isUnlisted";
import isLoggedIn from "../../permissions/isLoggedIn";
import isOwner from "../../permissions/isOwner";
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
