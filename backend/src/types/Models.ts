import { AbcModel } from "../schemas/abc";
import { NewsModel } from "../schemas/news";
import { SessionModel } from "../schemas/session";
import { StationModel } from "../schemas/station";

export type Models = {
	abc: AbcModel;
	news: NewsModel;
	session: SessionModel;
	station: StationModel;
};
