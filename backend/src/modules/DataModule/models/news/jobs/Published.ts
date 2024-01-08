import DataModule from "@/modules/DataModule";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";
import { NewsModel } from "../schema";

export default class Published extends DataModuleJob {
	protected static _modelName = "news";

	protected static _hasPermission = true;

	protected async _execute() {
		const model = await DataModule.getModel<NewsModel>(this.getModelName());

		return model.find().published();
	}
}
