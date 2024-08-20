import Joi from "joi";
import DataModule from "../DataModule";
import DataModuleJob from "./DataModuleJob";

export default abstract class CreateJob extends DataModuleJob {
	protected static _payloadSchema = Joi.object({
		query: Joi.object().min(1).required()
	});

	protected async _execute() {
		const { query } = this._payload;

		const model = await DataModule.getModel(this.getModelName());

		if (model.schema.path("createdBy"))
			query.createdBy = (await this._context.getUser())._id;

		return model.create(query);
	}
}
