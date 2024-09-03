import ModelCreatedEvent from "@/modules/DataModule/ModelCreatedEvent";
import Session from "../../Session";

export default abstract class SessionCreatedEvent extends ModelCreatedEvent {
	protected static _model = Session;
}
