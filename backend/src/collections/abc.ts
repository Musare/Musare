import mongoose from "mongoose";
import { DocumentAttribute, DefaultSchema } from "../types/Collections";

export type AbcCollection = DefaultSchema & {
	document: {
		name: DocumentAttribute<{ type: StringConstructor }>;
		autofill: {
			enabled: DocumentAttribute<{
				type: BooleanConstructor;
				required: false;
				restricted: true;
			}>;
		};
	};
};

export const schema: AbcCollection = {
	document: {
		_id: {
			type: mongoose.Types.ObjectId,
			required: true,
			cacheKey: true,
			restricted: false
		},
		createdAt: {
			type: Date,
			required: true,
			restricted: false
		},
		updatedAt: {
			type: Date,
			required: true,
			restricted: false
		},
		name: {
			type: String,
			required: true,
			restricted: false
		},
		autofill: {
			enabled: {
				type: Boolean,
				required: false,
				restricted: true // TODO: Set to false when empty 2nd layer object fixed
			}
		}
	},
	timestamps: true,
	version: 1
};
