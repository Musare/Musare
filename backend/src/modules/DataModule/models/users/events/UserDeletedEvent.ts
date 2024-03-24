import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";

export default abstract class UserDeletedEvent extends ModelDeletedEvent {
	protected static _modelName = "users";
}
