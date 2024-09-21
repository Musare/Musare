import Joi from "joi";
import DataModuleJob from "./DataModuleJob";

export default abstract class DeleteByIdJob extends DataModuleJob {
	protected static _payloadSchema = Joi.object({
		_id: Joi.string()
			.pattern(/^[0-9a-fA-F]{24}$/)
			.required()
	});

	protected async _execute() {
		const { _id } = this._payload;

		return this.getModel().destroy({
			where: { _id },
			individualHooks: true
		});
	}
}
