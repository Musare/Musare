import { isObjectIdOrHexString } from "mongoose";
import DataModule from "../DataModule";
import DataModuleJob from "./DataModuleJob";

export default abstract class UpdateByIdJob extends DataModuleJob {
	protected override async _validate() {
		if (typeof this._payload !== "object" || this._payload === null)
			throw new Error("Payload must be an object");

		if (!isObjectIdOrHexString(this._payload._id))
			throw new Error("_id is not an ObjectId");

		if (typeof this._payload.query !== "object")
			throw new Error("Query is not an object");

		if (Object.keys(this._payload.query).length === 0)
			throw new Error("Empty query object provided");
	}

	protected async _execute() {
		const { _id, query } = this._payload;

		const model = await DataModule.getModel(this.getModelName());

		return model.updateOne({ _id }, { $set: query });
	}
}
