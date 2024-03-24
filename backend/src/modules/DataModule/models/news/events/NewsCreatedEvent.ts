import ModelCreatedEvent from "@/modules/DataModule/ModelCreatedEvent";

export default abstract class NewsCreatedEvent extends ModelCreatedEvent {
	protected static _modelName = "news";
}
