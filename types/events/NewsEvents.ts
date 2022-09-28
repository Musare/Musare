import { NewsModel } from "../models/News";

type BaseNewsEventsResponse = {
	data: {
		news: NewsModel;
	};
};

export type NewsCreatedResponse = BaseNewsEventsResponse;
export type NewsUpdatedResponse = BaseNewsEventsResponse;
export type NewsRemovedResponse = {
	data: {
		newsId: string
	}
};
