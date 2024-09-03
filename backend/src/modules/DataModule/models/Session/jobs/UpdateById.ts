import UpdateByIdJob from "@/modules/DataModule/UpdateByIdJob";
import Session from "../../Session";

export default class UpdateById extends UpdateByIdJob {
	protected static _model = Session;
}
