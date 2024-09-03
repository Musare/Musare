import DeleteManyByIdJob from "@/modules/DataModule/DeleteManyByIdJob";
import User from "../../User";

export default class DeleteManyById extends DeleteManyByIdJob {
	protected static _model = User;
}
