import { HydratedDocument } from "mongoose";
import { NewsStatus } from "../models/news/NewsStatus";
import { NewsSchema } from "../models/news/schema";

/**
 * Simply used to check if a news model exists and is published
 */
export default (model: HydratedDocument<NewsSchema>) =>
	model && model.status === NewsStatus.PUBLISHED;
