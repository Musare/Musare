import FindByIdJob from "@/modules/DataModule/FindByIdJob";
import MinifiedUser from "../../MinifiedUser";

export default class FindById extends FindByIdJob {
	protected static _model = MinifiedUser;

	protected static _hasPermission = true;
}
