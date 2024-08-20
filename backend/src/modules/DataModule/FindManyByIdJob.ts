import Joi from "joi";
import DataModule from "../DataModule";
import DataModuleJob from "./DataModuleJob";

export default abstract class FindManyByIdJob extends DataModuleJob {
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
		const model = await DataModule.getModel(this.getModelName());

		const { _ids } = this._payload;
		const query = model.find({
			_id: _ids
		});

		return query.exec();
	}
}
