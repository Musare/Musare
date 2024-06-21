import DataModuleEvent from "./DataModuleEvent";

export default abstract class ModelUpdatedEvent extends DataModuleEvent {
	protected static _name = "updated";
}
