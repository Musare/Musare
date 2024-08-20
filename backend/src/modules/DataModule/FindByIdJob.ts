import Joi from "joi";
import DataModule from "../DataModule";
import DataModuleJob from "./DataModuleJob";

export default abstract class FindByIdJob extends DataModuleJob {
	protected static _payloadSchema = Joi.object({
		_id: Joi.string()
			.pattern(/^[0-9a-fA-F]{24}$/)
			.required()
	});

	protected async _execute() {
		const model = await DataModule.getModel(this.getModelName());

		const query = model.findById(this._payload._id);

		return query.exec();
	}
}
