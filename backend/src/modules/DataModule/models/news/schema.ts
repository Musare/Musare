import {
	HydratedDocument,
	Model,
	QueryWithHelpers,
	Schema,
	SchemaOptions,
	SchemaTypes,
	Types
} from "mongoose";
import { GetData } from "@/modules/DataModule/plugins/getData";
import { BaseSchema } from "@/modules/DataModule/types/Schemas";
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

// eslint-disable-next-line @typescript-eslint/ban-types
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
			ref: "minifiedUsers",
			required: true
		}
	},
	config
);

export type NewsSchemaType = typeof schema;

// eslint-disable-next-line @typescript-eslint/ban-types
export type NewsSchemaOptions = SchemaOptions<NewsSchema, {}, NewsQueryHelpers>;
