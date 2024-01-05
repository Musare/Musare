import { Types } from "mongoose";
import DataModule from "../DataModule";
import DataModuleJob from "./DataModuleJob";

export default abstract class FindByIdJob extends DataModuleJob {
	protected async _execute({ _id }: { _id: Types.ObjectId }) {
		const model = await DataModule.getModel(this.getModelName());

		const query = model.findById(_id);

		return query.exec();
	}
}
