import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";

export default abstract class SessionUpdatedEvent extends ModelUpdatedEvent {
	protected static _modelName = "sessions";
}
