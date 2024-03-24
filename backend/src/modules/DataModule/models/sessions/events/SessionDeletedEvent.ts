import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";

export default abstract class SessionDeletedEvent extends ModelDeletedEvent {
	protected static _modelName = "sessions";
}
