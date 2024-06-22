import { HydratedDocument } from "mongoose";
import DataModuleEvent from "./DataModuleEvent";
import { UserSchema } from "@models/users/schema";
import GetModelPermissions, { GetModelPermissionsResult } from "@models/users/jobs/GetModelPermissions";

export default abstract class ModelUpdatedEvent extends DataModuleEvent {
	protected static _name = "updated";

	public static async hasPermission(
		user: HydratedDocument<UserSchema> | null,
		scope?: string
	) {
		const permissions = (await new GetModelPermissions({
			_id: user?._id,
			modelName: this.getModelName(),
			modelId: scope
		}).execute()) as GetModelPermissionsResult;

		return !!(
			permissions[`data.${this.getModelName()}.findById`]
		);
	}
}
