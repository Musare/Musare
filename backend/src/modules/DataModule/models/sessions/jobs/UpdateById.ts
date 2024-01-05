import UpdateByIdJob from "@/modules/DataModule/UpdateByIdJob";
import { Models } from "@/types/Models";

export default class UpdateById extends UpdateByIdJob {
	protected static _modelName: keyof Models = "sessions";
}
