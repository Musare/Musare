import mongoose from "mongoose";
import { Types, DocumentAttribute, DefaultSchema } from "../types/Collections";

export type AbcCollection = DefaultSchema & {
	document: {
		name: DocumentAttribute<{ type: Types.String }>;
		autofill: {
			enabled: DocumentAttribute<{
				type: BooleanConstructor;
				required: false;
				restricted: true;
			}>;
		};
	};
};

// validate: async (value: any) => {
// 	if (!mongoose.Types.ObjectId.isValid(value))
// 		throw new Error("Value is not a valid ObjectId");
// }

// validate: async (value: any) => {
// 	if (value.length < 1 || value.length > 64)
// 		throw new Error("Name must be 1-64 characters");
// 	if (!/^[\p{Letter}0-9 .'_-]+$/gu.test(value))
// 		throw new Error("Invalid name provided");
// 	if (value.replaceAll(/[ .'_-]/g, "").length === 0)
// 		throw new Error(
// 			"Name must contain at least 1 letter or number"
// 		);
// }

export const schema: AbcCollection = {
	document: {
		_id: {
			type: Types.ObjectId,
			required: true,
			cacheKey: true
		},
		createdAt: {
			type: Types.Date,
			required: true
		},
		updatedAt: {
			type: Types.Date,
			required: true
		},
		name: {
			type: Types.String,
			required: true,
			restricted: true
		},
		autofill: {
			type: Types.Schema,
			schema: {
				enabled: {
					type: Types.Boolean,
					required: false,
					restricted: true // TODO: Set to false when empty 2nd layer object fixed
				}
			}
		},
		someNumbers: {
			type: Types.Array,
			item: {
				type: Types.Number
			}
		},
		songs: {
			type: Types.Array,
			item: {
				type: Types.Schema,
				schema: {
					_id: {
						type: Types.ObjectId,
						required: true
					}
				}
			}
		}
	},
	timestamps: true,
	version: 1
};
