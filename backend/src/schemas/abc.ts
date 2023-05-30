import { Model, Schema, SchemaTypes, Types } from "mongoose";
import { BaseSchema } from "../types/Schemas";

export interface AbcSchema extends BaseSchema {
	name: string;
	autofill?: {
		enabled?: boolean;
	};
	someNumbers: number[];
	songs: { _id: Types.ObjectId }[];
	restrictedName?: string;
	aNumber: number;
}

export type AbcModel = Model<AbcSchema>;

export const schema = new Schema<AbcSchema, AbcModel>({
	name: {
		type: SchemaTypes.String,
		required: true
	},
	autofill: {
		enabled: {
			type: SchemaTypes.Boolean,
			required: false
		}
	},
	someNumbers: [{ type: SchemaTypes.Number }],
	songs: [
		{
			_id: { type: SchemaTypes.ObjectId, required: true }
		}
	],
	restrictedName: {
		type: SchemaTypes.String,
		restricted: true
	},
	aNumber: { type: SchemaTypes.Number, required: true }
});

export type AbcSchemaType = typeof schema;
