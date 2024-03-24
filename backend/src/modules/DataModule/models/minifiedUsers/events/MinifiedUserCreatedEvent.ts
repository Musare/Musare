import ModelCreatedEvent from "@/modules/DataModule/ModelCreatedEvent";

export default abstract class MinifiedUserCreatedEvent extends ModelCreatedEvent {
	protected static _modelName = "minifiedUsers";
}
