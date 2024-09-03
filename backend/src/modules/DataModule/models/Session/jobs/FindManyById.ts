import FindManyByIdJob from "@/modules/DataModule/FindManyByIdJob";
import Session from "../../Session";

export default class FindManyById extends FindManyByIdJob {
	protected static _model = Session;
}
