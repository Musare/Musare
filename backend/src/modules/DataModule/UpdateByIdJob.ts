import { Types, isObjectIdOrHexString } from "mongoose";
import DataModule from "../DataModule";
import DataModuleJob from "./DataModuleJob";

export default abstract class UpdateByIdJob extends DataModuleJob {
	protected async _execute({
		_id,
		query
	}: {
		_id: Types.ObjectId;
		query: Record<string, any[]>;
	}) {
		const model = await DataModule.getModel(this.getModelName());

		if (!isObjectIdOrHexString(_id))
			throw new Error("_id is not an ObjectId");

		if (typeof query !== "object")
			throw new Error("Query is not an object");
		if (Object.keys(query).length === 0)
			throw new Error("Empty query object provided");

		return model.updateOne({ _id }, { $set: query });
	}
}
