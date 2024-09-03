import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";
import Session from "../../Session";

export default abstract class SessionDeletedEvent extends ModelDeletedEvent {
	protected static _model = Session;
}
