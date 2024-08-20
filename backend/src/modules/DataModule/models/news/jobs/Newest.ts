import Joi from "joi";
import DataModule from "@/modules/DataModule";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";
import { NewsModel } from "../schema";

export default class Newest extends DataModuleJob {
	protected static _modelName = "news";

	protected static _hasPermission = true;

	protected static _payloadSchema = Joi.object({
		showToNewUsers: Joi.boolean().optional(),
		limit: Joi.number().min(1).optional()
	});

	protected async _execute() {
		const model = await DataModule.getModel<NewsModel>(this.getModelName());

		const query = model.find().newest(this._payload?.showToNewUsers);

		if (this._payload?.limit) return query.limit(this._payload?.limit);

		return query;
	}
}
