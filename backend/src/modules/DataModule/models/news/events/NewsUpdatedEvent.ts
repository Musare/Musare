import { HydratedDocument } from "mongoose";
import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";
import { NewsStatus } from "@/modules/DataModule/models/news/NewsStatus";
import { NewsSchema } from "../schema";

export default abstract class NewsUpdatedEvent extends ModelUpdatedEvent {
	protected static _modelName = "news";

	// TODO make this function shared
	protected static _hasPermission = (model: HydratedDocument<NewsSchema>) => {
		if (model?.status === NewsStatus.PUBLISHED) return true;
		return false;
	};
}
