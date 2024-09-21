import Joi from "joi";
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

		return this.getModel().update(query, {
			where: { _id },
			individualHooks: true
		});
	}
}
