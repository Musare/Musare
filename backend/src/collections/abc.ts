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
			restricted: false,
			validate: async (value: any) => {
				if (!mongoose.Types.ObjectId.isValid(value))
					throw new Error("Value is not a valid ObjectId");
			}
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
			restricted: false,
			validate: async (value: any) => {
				if (value.length < 1 || value.length > 64)
					throw new Error("Name must be 1-64 characters");
				if (!/^[\p{Letter}0-9 .'_-]+$/gu.test(value))
					throw new Error("Invalid name provided");
				if (value.replaceAll(/[ .'_-]/g, "").length === 0)
					throw new Error(
						"Name must contain at least 1 letter or number"
					);
			}
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