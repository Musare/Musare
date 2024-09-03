import FindManyByIdJob from "@/modules/DataModule/FindManyByIdJob";
import User from "../../User";

export default class FindManyById extends FindManyByIdJob {
	protected static _model = User;
}
