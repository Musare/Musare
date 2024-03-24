import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";

export default abstract class NewsUpdatedEvent extends ModelUpdatedEvent {
	protected static _modelName = "news";
}
