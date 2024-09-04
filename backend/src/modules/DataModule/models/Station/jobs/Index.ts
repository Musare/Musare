import { forEachIn } from "@common/utils/forEachIn";
import Joi from "joi";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";
import isDj from "@/modules/DataModule/permissions/modelPermissions/isDj";
import isOwner from "@/modules/DataModule/permissions/modelPermissions/isOwner";
import isPublic from "@/modules/DataModule/permissions/modelPermissions/isPublic";
import Station from "../../Station";

export default class Index extends DataModuleJob {
	protected static _model = Station;

	protected static _hasPermission = true;

	protected static _payloadSchema = Joi.object({
		adminFilter: Joi.boolean().optional()
	});

	protected async _execute() {
		const model = this.getModel();

		const data = await model.findAll();

		const user = await this._context.getUser().catch(() => null);

		const stations: Station[] = [];

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
