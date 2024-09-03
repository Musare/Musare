import CreateJob from "@/modules/DataModule/CreateJob";
import User from "../../User";

export default class Create extends CreateJob {
	protected static _model = User;
}
