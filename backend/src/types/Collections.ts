import mongoose, { Model } from "mongoose";
import { AbcCollection } from "../collections/abc";

export type DocumentAttribute<
	T extends {
		type: unknown;
		required?: boolean;
		cacheKey?: boolean;
		restricted?: boolean;
	}
> = {
	type: T["type"];
	required: T["required"]; // TODO fix default unknown
	cacheKey?: T["cacheKey"]; // TODO fix default unknown
	restricted: T["restricted"]; // TODO fix default unknown
};

export type DefaultSchema = {
	document: Record<
		string,
		| DocumentAttribute<{ type: unknown }>
		| Record<string, DocumentAttribute<{ type: unknown }>>
	> & {
		_id: DocumentAttribute<{
			type: typeof mongoose.Types.ObjectId;
		}>;
		createdAt: DocumentAttribute<{ type: DateConstructor }>;
		updatedAt: DocumentAttribute<{ type: DateConstructor }>;
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
