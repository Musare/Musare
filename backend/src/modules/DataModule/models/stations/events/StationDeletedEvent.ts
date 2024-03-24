import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";

export default abstract class StationDeletedEvent extends ModelDeletedEvent {
	protected static _modelName = "stations";
}
