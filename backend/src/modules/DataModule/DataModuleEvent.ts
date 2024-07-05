import { HydratedDocument, Model } from "mongoose";
import DataModule from "../DataModule";
import ModuleEvent from "../EventsModule/ModuleEvent";
import { UserSchema } from "./models/users/schema";

export default abstract class DataModuleEvent extends ModuleEvent {
	protected static _module = DataModule;

	protected static _modelName: string;

	protected static _hasPermission:
		| boolean
		| CallableFunction
		| (boolean | CallableFunction)[] = false;

	public static override getName() {
		return `${this._modelName}.${super.getName()}`;
	}

	public static getModelName() {
		return this._modelName;
	}

	public static async hasPermission(
		model: HydratedDocument<Model<any>>, // TODO model can be null too, as GetModelPermissions is currently written
		user: HydratedDocument<UserSchema> | null
	) {
		const options = Array.isArray(this._hasPermission)
			? this._hasPermission
			: [this._hasPermission];

		return options.reduce(async (previous, option) => {
			if (await previous) return true;

			if (typeof option === "boolean") return option;

			if (typeof option === "function") return option(model, user);

			return false;
		}, Promise.resolve(false));
	}
}
