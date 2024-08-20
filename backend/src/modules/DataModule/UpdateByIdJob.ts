import Joi from "joi";
import DataModule from "../DataModule";
import DataModuleJob from "./DataModuleJob";

export default abstract class UpdateByIdJob extends DataModuleJob {
	protected static _payloadSchema = Joi.object({
		_id: Joi.string()
			.pattern(/^[0-9a-fA-F]{24}$/)
			.required(),
		query: Joi.object().min(1).required()
	});

	protected async _execute() {
		const { _id, query } = this._payload;

		const model = await DataModule.getModel(this.getModelName());

		return model.updateOne({ _id }, { $set: query });
	}
}
