import { HydratedDocument } from "mongoose";
import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";
import { NewsStatus } from "@/modules/DataModule/models/news/NewsStatus";
import { NewsSchema } from "../schema";

export default abstract class NewsDeletedEvent extends ModelDeletedEvent {
	protected static _modelName = "news";

	// TODO make this function shared
	protected static _hasPermission = (model: HydratedDocument<NewsSchema>) => {
		if (model?.status === NewsStatus.PUBLISHED) return true;
		return false;
	};
}
