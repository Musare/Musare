import { GenericResponse } from "./GenericActions";
import { NewsModel } from "../models/News";

type BaseNewsResponse = GenericResponse & {
	data: {
		news: NewsModel;
	};
};

export type NewestResponse = BaseNewsResponse;
export type GetNewsResponse = BaseNewsResponse;
export type GetPublishedNewsResponse = GenericResponse & {
	data: {
		news: NewsModel[]
	}
};
