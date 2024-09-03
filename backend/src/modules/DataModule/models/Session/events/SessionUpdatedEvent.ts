import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";
import Session from "../../Session";

export default abstract class SessionUpdatedEvent extends ModelUpdatedEvent {
	protected static _model = Session;
}
