import { BaseResponse } from "./BaseActions";
import { NewsModel } from "../models/News";

type BaseNewsResponse = BaseResponse & {
	data: {
		news: NewsModel;
	};
};

export type NewestResponse = BaseNewsResponse;
export type GetNewsResponse = BaseNewsResponse;
export type GetPublishedNewsResponse = BaseResponse & {
	data: {
		news: NewsModel[]
	}
};
export type CreateNewsResponse = BaseResponse;
export type UpdateNewsResponse = BaseResponse;
export type RemoveNewsResponse = BaseResponse;
