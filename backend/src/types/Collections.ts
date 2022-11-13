import mongoose, { Model } from "mongoose";
import { AbcCollection } from "../collections/abc";

export enum Types {
	String,
	Number,
	Date,
	Boolean,
	ObjectId,
	Array,
	// Map,
	Schema
}

export type DocumentAttribute<
	T extends {
		type: Types;
		required?: boolean;
		cacheKey?: boolean;
		restricted?: boolean;
		validate?: (value: any) => Promise<void>;
	}
> = {
	type: T["type"];
	required?: T["required"]; // TODO fix default unknown
	cacheKey?: T["cacheKey"]; // TODO fix default unknown
	restricted?: T["restricted"]; // TODO fix default unknown
	validate?: T["validate"]; // TODO fix default unknown
};

export type DefaultSchema = {
	document: Record<
		string,
		| DocumentAttribute<{ type: Types }>
		| Record<string, DocumentAttribute<{ type: unknown }>>
	> & {
		_id: DocumentAttribute<{
			type: Types.ObjectId;
		}>;
		createdAt: DocumentAttribute<{ type: Types.Date }>;
		updatedAt: DocumentAttribute<{ type: Types.Date }>;
	};
	timestamps: boolean;
	version: number;
};

export type Collections = {
	abc: {
		schema: AbcCollection;
		model: Model<AbcCollection["document"]>;
	};
};
