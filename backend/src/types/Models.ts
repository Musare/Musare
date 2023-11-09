import { AbcModel } from "@models/schemas/abc/schema";
import { NewsModel } from "@models/schemas/news/schema";
import { SessionModel } from "@models/schemas/sessions/schema";
import { StationModel } from "@models/schemas/stations/schema";
import { UserModel } from "@models/schemas/users/schema";

export type Models = {
	abc: AbcModel;
	news: NewsModel;
	sessions: SessionModel;
	stations: StationModel;
	users: UserModel;
};

export type AnyModel = Models[keyof Models];
