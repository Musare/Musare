import BaseModule from "@/BaseModule";
import Event from "./Event";

export default abstract class ModuleEvent extends Event {
	protected static _module: InstanceType<typeof BaseModule>;

	public static getNamespace() {
		return this._module.getName();
	}
}
