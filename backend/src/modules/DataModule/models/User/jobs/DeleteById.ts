import DeleteByIdJob from "@/modules/DataModule/DeleteByIdJob";
import User from "../../User";

export default class DeleteById extends DeleteByIdJob {
	protected static _model = User;
}
