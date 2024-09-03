import DeleteByIdJob from "@/modules/DataModule/DeleteByIdJob";
import Session from "../../Session";

export default class DeleteById extends DeleteByIdJob {
	protected static _model = Session;
}
