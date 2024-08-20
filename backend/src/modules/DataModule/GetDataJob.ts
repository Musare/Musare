import { Model } from "mongoose";
import Joi from "joi";
import DataModule from "../DataModule";
import DataModuleJob from "./DataModuleJob";
import { FilterType, GetData } from "./plugins/getData";

export default abstract class GetDataJob extends DataModuleJob {
	protected static _payloadSchema = Joi.object({
		page: Joi.number().required(),
		pageSize: Joi.number().required(),
		properties: Joi.array()
			.items(Joi.string().required())
			.min(1)
			.required(),
		sort: Joi.object()
			.pattern(
				/^/,
				Joi.string().valid("ascending", "descending").required()
			)
			.required(),
		queries: Joi.array()
			.items(
				Joi.object({
					filter: Joi.object({
						property: Joi.string().required()
					}).required(),
					filterType: Joi.string()
						.valid(...Object.values(FilterType))
						.required()
				})
			)
			.required(),
		operator: Joi.string().valid("and", "or", "nor").required()
	});

	protected async _execute() {
		const model = await DataModule.getModel<Model<any> & Partial<GetData>>(
			this.getModelName()
		);

		if (typeof model.getData !== "function")
			throw new Error("Get data not available for model");

		return model.getData(this._payload);
	}
}
