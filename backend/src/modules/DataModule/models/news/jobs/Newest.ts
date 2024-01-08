import DataModule from "@/modules/DataModule";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";
import { NewsModel } from "../schema";

export default class Newest extends DataModuleJob {
	protected static _modelName = "news";

	protected static _hasPermission = true;

	protected override async _validate() {
		if (
			typeof this._payload !== "object" &&
			typeof this._payload !== "undefined" &&
			this._payload !== null
		)
			throw new Error("Payload must be an object or undefined");

		if (
			typeof this._payload?.showToNewUsers !== "boolean" &&
			typeof this._payload?.showToNewUsers !== "undefined" &&
			this._payload?.showToNewUsers !== null
		)
			throw new Error("Show to new users must be a boolean or undefined");

		if (
			typeof this._payload?.limit !== "number" &&
			typeof this._payload?.limit !== "undefined" &&
			this._payload?.limit !== null
		)
			throw new Error("Limit must be a number or undefined");
	}

	protected async _execute() {
		const model = await DataModule.getModel<NewsModel>(this.getModelName());

		const query = model.find().newest(this._payload?.showToNewUsers);

		if (this._payload?.limit) return query.limit(this._payload?.limit);

		return query;
	}
}
