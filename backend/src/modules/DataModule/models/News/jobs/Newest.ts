import Joi from "joi";
import News from "@models/News";
import { NewsStatus } from "@models/News/NewsStatus";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";

export default class Newest extends DataModuleJob {
	protected static _model = News;

	protected static _hasPermission = true;

	protected static _payloadSchema = Joi.object({
		showToNewUsers: Joi.boolean().optional(),
		limit: Joi.number().min(1).optional()
	});

	protected async _execute() {
		return this.getModel().findAll({
			order: [["created_at", "DESC"]],
			limit: this._payload?.limit,
			where: {
				status: NewsStatus.PUBLISHED
			}
		});
	}
}
