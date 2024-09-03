import Joi from "joi";
import DataModuleJob from "./DataModuleJob";

export default abstract class DeleteManyByIdJob extends DataModuleJob {
	protected static _isBulk = true;

	protected static _payloadSchema = Joi.object({
		_ids: Joi.array()
			.items(
				Joi.string()
					.pattern(/^[0-9a-fA-F]{24}$/)
					.required()
			)
			.min(1)
			.required()
	});

	protected async _execute() {
		const { _ids } = this._payload;

		return this.getModel().destroy({
			where: { _id: _ids }
		});
	}
}
