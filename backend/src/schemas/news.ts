import { Schema, SchemaTypes, Types } from "mongoose";

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
	createdAt: NativeDate;
}

export const schema = new Schema<NewsSchema>({
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
	},
	createdAt: {
		type: SchemaTypes.Date,
		default: Date.now,
		required: true
	}
});
