import Joi from "joi";
import UpdateByIdJob from "@/modules/DataModule/UpdateByIdJob";
import User from "../../User";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import isSelf from "@/modules/DataModule/permissions/modelPermissions/isSelf";

export default class UpdateById extends UpdateByIdJob {
	protected static _model = User;

	protected static _hasModelPermission = [isAdmin, isSelf];

	protected static _payloadSchema = Joi.object({
		_id: Joi.string()
			.pattern(/^[0-9a-fA-F]{24}$/)
			.required(),
		query: Joi.object({
			nightmode: Joi.boolean().optional(),
		}).required()
	});
}
