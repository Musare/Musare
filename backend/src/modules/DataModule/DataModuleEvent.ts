import DataModule from "../DataModule";
import ModuleEvent from "../EventsModule/ModuleEvent";

export default abstract class DataModuleEvent extends ModuleEvent {
	protected static _module = DataModule;

	protected static _modelName: string;

	public static override getName() {
		return `${this._modelName}.${super.getName()}`;
	}

	public static getModelName() {
		return this._modelName;
	}

	public getModelName() {
		return (this.constructor as typeof DataModuleEvent).getModelName();
	}
}
