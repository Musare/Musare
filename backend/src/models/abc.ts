import { InferSchemaType, Schema, SchemaTypes } from "mongoose";

export const schema = new Schema({
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

export type AbcSchema = typeof schema;
