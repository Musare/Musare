import DataModule from "@/modules/DataModule";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";
import { Models } from "@/types/Models";

export default class Published extends DataModuleJob {
	protected static _modelName: keyof Models = "news";

	protected static _hasPermission = true;

	protected async _execute() {
		const model = await DataModule.getModel(this.getModelName());

		return model.find().published();
	}
}
