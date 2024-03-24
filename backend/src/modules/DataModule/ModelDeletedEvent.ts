import DataModuleEvent from "./DataModuleEvent";

export default abstract class ModelDeletedEvent extends DataModuleEvent {
	protected static _name = "deleted";
}
