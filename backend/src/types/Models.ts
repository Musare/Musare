import { AbcModel, AbcSchemaType } from "../schemas/abc";
import { NewsModel, NewsSchemaType } from "../schemas/news";
import { StationModel, StationSchemaType } from "../schemas/station";

export type Schemas = {
	abc: AbcSchemaType;
	news: NewsSchemaType;
	station: StationSchemaType;
};

export type Models = {
	abc: AbcModel;
	news: NewsModel;
	station: StationModel;
};
