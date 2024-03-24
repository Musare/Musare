import DataModuleEvent from "./DataModuleEvent";

export default abstract class ModelCreatedEvent extends DataModuleEvent {
	protected static _name = "created";
}
