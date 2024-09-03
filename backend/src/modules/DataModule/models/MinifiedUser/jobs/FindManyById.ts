import FindManyByIdJob from "@/modules/DataModule/FindManyByIdJob";
import MinifiedUser from "../../MinifiedUser";

export default class FindManyById extends FindManyByIdJob {
	protected static _model = MinifiedUser;

	protected static _hasPermission = true;
}
