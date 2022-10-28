import mongoose, { Model } from "mongoose";
import { AbcCollection } from "../collections/abc";

export type DocumentAttribute<
	T extends {
		type: unknown;
		required?: boolean;
	}
> = {
	type: T["type"];
	required: T extends { required: false } ? false : true;
};

export type DefaultSchema = {
	document: Record<
		string,
		| DocumentAttribute<{ type: unknown }>
		| Record<string, DocumentAttribute<{ type: unknown }>>
	> & {
		_id: DocumentAttribute<{
			type: typeof mongoose.Schema.Types.ObjectId;
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
