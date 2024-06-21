import DataModule from "../DataModule";
import ModuleEvent from "../EventsModule/ModuleEvent";
import { HydratedDocument } from "mongoose";
import { UserSchema } from "./models/users/schema";
import { GetPermissionsResult } from "./models/users/jobs/GetPermissions";
import GetModelPermissions from "./models/users/jobs/GetModelPermissions";

export default abstract class DataModuleEvent extends ModuleEvent {
	protected static _module = DataModule;

	protected static _modelName: string;

	public static override getName() {
		return `${this._modelName}.${super.getName()}`;
	}

	public static getModelName() {
		return this._modelName;
	}

	public static async hasPermission(
		user: HydratedDocument<UserSchema> | null,
		scope?: string
	) {
		const permissions = (await new GetModelPermissions({
			_id: user?._id,
			modelName: this.getModelName(),
			modelId: scope
		}).execute()) as GetPermissionsResult;

		return !!(
			permissions[`event:${this.getKey(scope)}`] ||
			permissions[`event:${this.getPath()}:*`]
		);
	}
}
