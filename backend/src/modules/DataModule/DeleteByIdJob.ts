import { Types, isObjectIdOrHexString } from "mongoose";
import DataModule from "../DataModule";
import DataModuleJob from "./DataModuleJob";

export default abstract class DeleteByIdJob extends DataModuleJob {
	protected async _execute({ _id }: { _id: Types.ObjectId }) {
		const model = await DataModule.getModel(this.getModelName());

		if (!isObjectIdOrHexString(_id))
			throw new Error("_id is not an ObjectId");

		return model.deleteOne({ _id });
	}
}
