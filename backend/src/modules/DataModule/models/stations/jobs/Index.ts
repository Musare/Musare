import { HydratedDocument } from "mongoose";
import { forEachIn } from "@common/utils/forEachIn";
import DataModule from "@/modules/DataModule";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";
import isDj from "@/modules/DataModule/permissions/isDj";
import isOwner from "@/modules/DataModule/permissions/isOwner";
import isPublic from "@/modules/DataModule/permissions/isPublic";
import { StationModel, StationSchema } from "../schema";

export default class Index extends DataModuleJob {
	protected static _modelName = "stations";

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

	protected async _execute() {
		const model = await DataModule.getModel<StationModel>(
			this.getModelName()
		);

		const data = await model.find();

		const user = await this._context.getUser().catch(() => null);

		const stations: HydratedDocument<StationSchema>[] = [];

		await forEachIn(data, async station => {
			if (
				isPublic(station) ||
				(user && (isOwner(station, user) || isDj(station, user))) ||
				(this._payload?.adminFilter &&
					(await this._context
						.assertPermission("data.stations.index.adminFilter")
						.then(() => true)
						.catch(() => false)))
			)
				stations.push(station);
		});

		return stations;
	}
}
