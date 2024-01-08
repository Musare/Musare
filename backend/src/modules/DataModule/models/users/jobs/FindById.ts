import { HydratedDocument } from "mongoose";
import FindByIdJob from "@/modules/DataModule/FindByIdJob";
import { UserModel } from "../schema";

export default class FindById extends FindByIdJob {
	protected static _modelName = "users";

	protected static _hasPermission = this._isSelf;

	protected static _isSelf(
		model: HydratedDocument<UserModel>,
		user?: HydratedDocument<UserModel>
	) {
		return model._id === user?._id;
	}
}
