import ModelCreatedEvent from "@/modules/DataModule/ModelCreatedEvent";

export default abstract class SessionCreatedEvent extends ModelCreatedEvent {
	protected static _modelName = "sessions";
}
