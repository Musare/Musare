import mongoose from "mongoose";
import { DocumentAttribute, DefaultSchema } from "../types/Collections";

export type AbcCollection = DefaultSchema & {
	document: {
		name: DocumentAttribute<{ type: StringConstructor }>;
		autofill: {
			enabled: DocumentAttribute<{
				type: BooleanConstructor;
				required: true;
			}>;
		};
	};
};

export const schema: AbcCollection = {
	document: {
		_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			cacheKey: true
		},
		createdAt: {
			type: Date,
			required: true
		},
		updatedAt: {
			type: Date,
			required: true
		},
		name: {
			type: String,
			required: true
		},
		autofill: {
			enabled: {
				type: Boolean,
				required: true // TODO: Set to false when fixed
			}
		}
	},
	timestamps: true,
	version: 1
};
