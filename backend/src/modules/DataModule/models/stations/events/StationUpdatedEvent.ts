import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";

export default abstract class StationUpdatedEvent extends ModelUpdatedEvent {
	protected static _modelName = "stations";
}
