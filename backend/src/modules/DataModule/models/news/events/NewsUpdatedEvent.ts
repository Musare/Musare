import { HydratedDocument, Schema } from "mongoose";
import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";
import { NewsStatus } from "@/modules/DataModule/models/news/NewsStatus";

export default abstract class NewsUpdatedEvent extends ModelUpdatedEvent {
	protected static _modelName = "news";

	protected static _hasPermission = <ModelSchemaType extends Schema>(
		model: HydratedDocument<ModelSchemaType>
	) => {
		// eslint-disable-next-line
		// @ts-ignore
		if (model?.status === NewsStatus.PUBLISHED) return true;
		return false;
	};
}
