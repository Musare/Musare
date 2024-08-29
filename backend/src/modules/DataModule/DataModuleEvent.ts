import { Model, ModelStatic } from "sequelize";
import DataModule from "../DataModule";
import ModuleEvent from "../EventsModule/ModuleEvent";

export default abstract class DataModuleEvent extends ModuleEvent {
	protected static _module = DataModule;

	protected static _model: ModelStatic<any>;

	protected static _hasModelPermission:
		| boolean
		| CallableFunction
		| (boolean | CallableFunction)[] = false;

	public static getModel() {
		return this._model;
	}

	public static override getName() {
		return `${this.getModel().getTableName()}.${super.getName()}`;
	}

	public static async hasModelPermission(
		model: Model | null,
		user: Model | null
	) {
		const options = Array.isArray(this._hasModelPermission)
			? this._hasModelPermission
			: [this._hasModelPermission];

		return options.reduce(async (previous, option) => {
			if (await previous) return true;

			if (typeof option === "boolean") return option;

			if (typeof option === "function") return option(model, user);

			return false;
		}, Promise.resolve(false));
	}
}
