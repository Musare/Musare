import Joi from "joi";
import UpdateByIdJob from "@/modules/DataModule/UpdateByIdJob";
import User from "../../User";
import { UserAvatarType } from "../UserAvatarType";
import { UserAvatarColor } from "../UserAvatarColor";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import isSelf from "@/modules/DataModule/permissions/modelPermissions/isSelf";
import { Op } from "sequelize";

export default class UpdateById extends UpdateByIdJob {
	protected static _model = User;

	protected static _hasPermission = isAdmin;

	protected static _hasModelPermission = isSelf;

	protected static _payloadSchema = Joi.object({
		_id: Joi.string()
			.pattern(/^[0-9a-fA-F]{24}$/)
			.required(),
		query: Joi.object({
			username: Joi.string().min(2).max(32).regex(/^_*[a-zA-Z0-9][a-zA-Z0-9_]*$/).optional(),
			emailAddress: Joi.string().email().min(3).max(254).optional(), // TODO: Whitelist regex
			name: Joi.string().max(64).optional(),
			location: Joi.string().max(50).optional().allow(null, ""),
			bio: Joi.string().max(200).optional().allow(null, ""), // TODO: Nullify empty strings
			avatarType: Joi.valid(...Object.values(UserAvatarType)).optional(),
			avatarColor: Joi.valid(...Object.values(UserAvatarColor))
				.optional()
				.allow(null),
			nightmode: Joi.boolean().optional(),
			autoSkipDisliked: Joi.boolean().optional(),
			activityLogPublic: Joi.boolean().optional(),
			anonymousSongRequests: Joi.boolean().optional(),
			activityWatch: Joi.boolean().optional()
		}).required()
	})
		.external(async ({ _id, query }) => {
			if (query.emailAddress === undefined) return;

			const user = await User.findOne({
				where: {
					[Op.not]: {
						_id
					},
					username: query.username
				}
			});

			if (user instanceof User)
				throw new Error("A user with that username already exists.");
		}, "uniqueUsername")
		.external(async ({ _id, query }) => {
			if (query.emailAddress === undefined) return;

			const user = await User.findOne({
				where: {
					[Op.not]: {
						_id
					},
					emailAddress: query.emailAddress
				}
			});

			if (user instanceof User)
				throw new Error("A user with that email already exists.");
		}, "uniqueEmail");
}
