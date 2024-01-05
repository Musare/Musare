import FindByIdJob from "@/modules/DataModule/FindByIdJob";
import { Models } from "@/types/Models";

export default class FindById extends FindByIdJob {
	protected static _modelName: keyof Models = "users";
}
