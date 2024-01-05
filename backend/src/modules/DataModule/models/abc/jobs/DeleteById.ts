import DeleteByIdJob from "@/modules/DataModule/DeleteByIdJob";
import { Models } from "@/types/Models";

export default class DeleteById extends DeleteByIdJob {
	protected static _modelName: keyof Models = "abc";
}
