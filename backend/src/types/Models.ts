import { AbcModel } from "../schemas/abc";
import { NewsModel } from "../schemas/news";
import { StationModel } from "../schemas/station";

export type Models = {
	abc: AbcModel;
	news: NewsModel;
	station: StationModel;
};
