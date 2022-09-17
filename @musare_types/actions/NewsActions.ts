import { BaseResponse } from "./BaseActions";
import { NewsModel } from "../models/News";

export type NewestResponse = BaseResponse & {
	data: {
		news: NewsModel;
	};
};
