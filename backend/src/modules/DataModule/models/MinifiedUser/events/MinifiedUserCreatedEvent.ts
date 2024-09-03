import ModelCreatedEvent from "@/modules/DataModule/ModelCreatedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import MinifiedUser from "../../MinifiedUser";

export default abstract class MinifiedUserCreatedEvent extends ModelCreatedEvent {
	protected static _model = MinifiedUser;

	protected static _hasPermission = isAdmin;
}
