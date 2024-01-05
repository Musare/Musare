import DataModule from "@/modules/DataModule";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";
import { Models } from "@/types/Models";

export default class Newest extends DataModuleJob {
	protected static _modelName: keyof Models = "news";

	protected static _hasPermission = true;

	protected async _execute(payload?: {
		showToNewUsers?: boolean;
		limit?: number;
	}) {
		const model = await DataModule.getModel(this.getModelName());

		const query = model.find().newest(payload?.showToNewUsers);

		if (payload?.limit) return query.limit(payload?.limit);

		return query;
	}
}
