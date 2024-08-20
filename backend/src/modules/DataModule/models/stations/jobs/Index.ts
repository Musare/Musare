import { HydratedDocument } from "mongoose";
import { forEachIn } from "@common/utils/forEachIn";
import Joi from "joi";
import DataModule from "@/modules/DataModule";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";
import isDj from "@/modules/DataModule/permissions/modelPermissions/isDj";
import isOwner from "@/modules/DataModule/permissions/modelPermissions/isOwner";
import isPublic from "@/modules/DataModule/permissions/modelPermissions/isPublic";
import { StationModel, StationSchema } from "../schema";

export default class Index extends DataModuleJob {
	protected static _modelName = "stations";

	protected static _hasPermission = true;

	protected static _payloadSchema = Joi.object({
		adminFilter: Joi.boolean().optional()
	});

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
						.assertPermission("data.stations.index:adminFilter") // TODO fix in new permission system
						.then(() => true)
						.catch(() => false)))
			)
				stations.push(station);
		});

		return stations;
	}
}
