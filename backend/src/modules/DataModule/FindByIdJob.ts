import { isObjectIdOrHexString } from "mongoose";
import DataModule from "../DataModule";
import DataModuleJob from "./DataModuleJob";

export default abstract class FindByIdJob extends DataModuleJob {
	protected override async _validate() {
		if (typeof this._payload !== "object" || this._payload === null)
			throw new Error("Payload must be an object");

		if (!isObjectIdOrHexString(this._payload._id))
			throw new Error("_id is not an ObjectId");
	}

	protected async _execute() {
		const model = await DataModule.getModel(this.getModelName());

		const query = model.findById(this._payload._id);

		return query.exec();
	}
}
