import { Model, Schema } from "mongoose";
import { AbcSchema } from "../schemas/abc";
import { NewsQueryHelpers, NewsSchema } from "../schemas/news";
import { StationSchema } from "../schemas/station";

export type Schemas = {
	abc: Schema<AbcSchema>;
	news: Schema<
		NewsSchema,
		Model<NewsSchema, NewsQueryHelpers>,
		{},
		NewsQueryHelpers
	>;
	station: Schema<StationSchema>;
};

export type Models = {
	abc: Model<AbcSchema>;
	news: Model<NewsSchema, NewsQueryHelpers>;
	station: Model<StationSchema>;
};
