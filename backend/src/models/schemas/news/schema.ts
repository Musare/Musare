import {
	HydratedDocument,
	Model,
	QueryWithHelpers,
	Schema,
	SchemaTypes,
	Types
} from "mongoose";
import { GetData } from "@/models/plugins/getData";
import { BaseSchema } from "@/types/Schemas";
import JobContext from "@/JobContext";
import { NewsStatus } from "./NewsStatus";
import config from "./config";

export interface NewsSchema extends BaseSchema {
	title: string;
	markdown: string;
	status: NewsStatus;
	showToNewUsers: boolean;
	createdBy: Types.ObjectId;
}

export interface NewsQueryHelpers {
	published(
		this: QueryWithHelpers<
			any,
			HydratedDocument<NewsSchema>,
			NewsQueryHelpers
		>,
		published?: boolean
	): QueryWithHelpers<
		HydratedDocument<NewsSchema>[],
		HydratedDocument<NewsSchema>,
		NewsQueryHelpers
	>;
	newest(
		this: QueryWithHelpers<
			any,
			HydratedDocument<NewsSchema>,
			NewsQueryHelpers
		>,
		showToNewUsers?: boolean
	): QueryWithHelpers<
		HydratedDocument<NewsSchema>[],
		HydratedDocument<NewsSchema>,
		NewsQueryHelpers
	>;
}

export interface NewsModel
	extends Model<NewsSchema, NewsQueryHelpers>,
		GetData {
	published: (context: JobContext) => Promise<NewsSchema[]>;
	newest: (
		context: JobContext,
		payload: { showToNewUsers?: boolean }
	) => Promise<NewsSchema[]>;
}

export const schema = new Schema<NewsSchema, NewsModel, {}, NewsQueryHelpers>(
	{
		title: {
			type: SchemaTypes.String,
			required: true
		},
		markdown: {
			type: SchemaTypes.String,
			required: true
		},
		status: {
			type: SchemaTypes.String,
			enum: Object.values(NewsStatus),
			default: NewsStatus.DRAFT,
			required: true
		},
		showToNewUsers: {
			type: SchemaTypes.Boolean,
			default: false,
			required: true
		},
		createdBy: {
			type: SchemaTypes.ObjectId,
			ref: "users",
			required: true
		}
	},
	config
);

export type NewsSchemaType = typeof schema;
