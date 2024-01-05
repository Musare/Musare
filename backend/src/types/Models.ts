import { NewsModel } from "@models/news/schema";
import { SessionModel } from "@models/sessions/schema";
import { StationModel } from "@models/stations/schema";
import { UserModel } from "@models/users/schema";
import { AbcModel } from "@models/abc/schema";

export type Models = {
	abc: AbcModel;
	news: NewsModel;
	sessions: SessionModel;
	stations: StationModel;
	users: UserModel;
};

export type AnyModel = Models[keyof Models];
