import FindByIdJob from "@/modules/DataModule/FindByIdJob";
import Session from "../../Session";

export default class FindById extends FindByIdJob {
	protected static _model = Session;
}
