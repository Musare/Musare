import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";

export default abstract class UserUpdatedEvent extends ModelUpdatedEvent {
	protected static _modelName = "users";
}
