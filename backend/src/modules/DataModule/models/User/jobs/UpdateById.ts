import UpdateByIdJob from "@/modules/DataModule/UpdateByIdJob";
import User from "../../User";

export default class UpdateById extends UpdateByIdJob {
	protected static _model = User;
}
