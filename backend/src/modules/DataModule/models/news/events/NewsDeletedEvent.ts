import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";

export default abstract class NewsDeletedEvent extends ModelDeletedEvent {
	protected static _modelName = "news";
}
