import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";

export default abstract class MinifiedUserUpdatedEvent extends ModelUpdatedEvent {
	protected static _modelName = "minifiedUsers";
}
