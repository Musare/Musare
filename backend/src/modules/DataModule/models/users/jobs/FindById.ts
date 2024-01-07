import FindByIdJob from "@/modules/DataModule/FindByIdJob";
import { Models } from "@/types/Models";
import { UserModel } from "../schema";

export default class FindById extends FindByIdJob {
	protected static _modelName: keyof Models = "users";

	protected static _hasPermission = this._isSelf;

	protected static _isSelf(model: UserModel, user?: UserModel) {
		return model._id === user?._id;
	}
}
