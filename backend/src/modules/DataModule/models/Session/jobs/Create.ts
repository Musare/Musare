import CreateJob from "@/modules/DataModule/CreateJob";
import Session from "../../Session";

export default class Create extends CreateJob {
	protected static _model = Session;
}
