import { isValidObjectId } from "mongoose";
import DataModule from "../DataModule";
import DataModuleJob from "./DataModuleJob";

export default abstract class FindManyByIdJob extends DataModuleJob {
	protected override async _validate() {
		if (typeof this._payload !== "object" || this._payload === null)
			throw new Error("Payload must be an object");
		if (!Array.isArray(this._payload._ids))
			throw new Error("Payload._ids must be an array");
		if (!this._payload._ids.every((_id: unknown) => isValidObjectId(_id)))
			throw new Error(
				"One or more payload._ids item(s) is not a valid ObjectId"
			);
	}

	protected async _execute() {
		const model = await DataModule.getModel(this.getModelName());

		const _ids = this._payload._ids;
		const query = model.find({
			_id: _ids
		});

		return query.exec();
	}
}
