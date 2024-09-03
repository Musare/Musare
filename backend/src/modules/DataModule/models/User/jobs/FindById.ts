import FindByIdJob from "@/modules/DataModule/FindByIdJob";
import User from "../../User";

export default class FindById extends FindByIdJob {
	protected static _model = User;

	protected static _hasModelPermission = this._isSelf;

	protected static _isSelf(model: User, user?: User) {
		return model._id === user?._id;
	}
}
