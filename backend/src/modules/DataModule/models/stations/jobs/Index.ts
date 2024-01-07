import DataModule from "@/modules/DataModule";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";
import isDj from "@/modules/DataModule/permissions/isDj";
import isOwner from "@/modules/DataModule/permissions/isOwner";
import isPublic from "@/modules/DataModule/permissions/isPublic";
import { Models } from "@/types/Models";

export default class Index extends DataModuleJob {
	protected static _modelName: keyof Models = "stations";

	protected static _hasPermission = true;

	protected override async _validate() {
		if (
			typeof this._payload !== "object" &&
			typeof this._payload !== "undefined" &&
			this._payload !== null
		)
			throw new Error("Payload must be an object or undefined");

		if (
			typeof this._payload?.adminFilter !== "boolean" &&
			typeof this._payload?.adminFilter !== "undefined" &&
			this._payload?.adminFilter !== null
		)
			throw new Error("Admin filter must be a boolean or undefined");
	}

	protected override async _authorize() {}

	protected async _execute(payload?: { adminFilter?: boolean }) {
		const model = await DataModule.getModel(this.getModelName());

		const data = await model.find();

		const user = await this._context.getUser().catch(() => null);

		const stations = [];

		for (const station of data) {
			if (
				isPublic(station) ||
				(user && (isOwner(station, user) || isDj(station, user))) ||
				(payload?.adminFilter &&
					(await this._context
						.assertPermission("data.stations.index.adminFilter")
						.then(() => true)
						.catch(() => false)))
			)
				stations.push(station);
		}

		return stations;
	}
}
