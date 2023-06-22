import {
	HydratedDocument,
	Model,
	QueryWithHelpers,
	Schema,
	SchemaTypes,
	Types
} from "mongoose";
import { GetData } from "./plugins/getData";
import { BaseSchema } from "../types/Schemas";
import JobContext from "../JobContext";

export enum NewsStatus {
	DRAFT = "draft",
	PUBLISHED = "published",
	ARCHIVED = "archived"
}

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
			required: true
		}
	},
	{
		// @ts-ignore
		documentVersion: 3,
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
		jobConfig: {
			published: {
				async method() {
					return this.find().published();
				},
				hasPermission: true
			},
			newest: {
				async method() {
					return this.find().newest(payload?.showToNewUsers);
				},
				hasPermission: true
			}
		},
		// @ts-ignore need to somehow use GetDataSchemaOptions
		getData: {
			enabled: true,
			specialProperties: {
				createdBy: [
					{
						$addFields: {
							createdByOID: {
								$convert: {
									input: "$createdBy",
									to: "objectId",
									onError: "unknown",
									onNull: "unknown"
								}
							}
						}
					},
					{
						$lookup: {
							from: "users",
							localField: "createdByOID",
							foreignField: "_id",
							as: "createdByUser"
						}
					},
					{
						$unwind: {
							path: "$createdByUser",
							preserveNullAndEmptyArrays: true
						}
					},
					{
						$addFields: {
							createdByUsername: {
								$ifNull: ["$createdByUser.username", "unknown"]
							}
						}
					},
					{
						$project: {
							createdByOID: 0,
							createdByUser: 0
						}
					}
				]
			},
			specialQueries: {
				createdBy: newQuery => ({
					$or: [newQuery, { createdByUsername: newQuery.createdBy }]
				})
			}
		}
	}
);

export type NewsSchemaType = typeof schema;
