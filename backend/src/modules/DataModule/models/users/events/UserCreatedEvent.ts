import ModelCreatedEvent from "@/modules/DataModule/ModelCreatedEvent";

export default abstract class UserCreatedEvent extends ModelCreatedEvent {
	protected static _modelName = "users";
}
