import Session from "@models/Session";
import User from "@models/User";
import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";

export default abstract class SessionDeletedEvent extends ModelDeletedEvent {
	protected static _model = Session;

	protected static _hasModelPermission = (model?: Session, user?: User) =>
		model && user && model.userId === user._id;
}
