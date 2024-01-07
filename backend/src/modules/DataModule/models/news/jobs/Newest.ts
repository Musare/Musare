import DataModule from "@/modules/DataModule";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";
import { Models } from "@/types/Models";

export default class Newest extends DataModuleJob {
	protected static _modelName: keyof Models = "news";

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

	protected async _execute(payload?: {
		showToNewUsers?: boolean;
		limit?: number;
	}) {
		const model = await DataModule.getModel(this.getModelName());

		const query = model.find().newest(payload?.showToNewUsers);

		if (payload?.limit) return query.limit(payload?.limit);

		return query;
	}
}
