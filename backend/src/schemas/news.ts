import {
	HydratedDocument,
	Model,
	QueryWithHelpers,
	Schema,
	SchemaTypes,
	Types
} from "mongoose";

export enum NewsStatus {
	DRAFT = "draft",
	PUBLISHED = "published",
	ARCHIVED = "archived"
}

export interface NewsSchema {
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

export const schema = new Schema<
	NewsSchema,
	Model<NewsSchema, NewsQueryHelpers>,
	{},
	NewsQueryHelpers
>(
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
			required: true
		}
	},
	{
		timestamps: true,
		query: {
			published() {
				return this.where({ status: NewsStatus.PUBLISHED });
			},
			newest(showToNewUsers = false) {
				const query = this.published().sort({ createdAt: "desc" });
				if (showToNewUsers) return query.where({ showToNewUsers });
				return query;
			}
		},
		pluginTags: ["useGetDataPlugin"]
	}
);
