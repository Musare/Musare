import ModelCreatedEvent from "@/modules/DataModule/ModelCreatedEvent";

export default abstract class StationCreatedEvent extends ModelCreatedEvent {
	protected static _modelName = "stations";
}
