import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";

export default abstract class MinifiedUserDeletedEvent extends ModelDeletedEvent {
	protected static _modelName = "minifiedUsers";
}
