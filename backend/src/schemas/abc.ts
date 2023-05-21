import { Schema, SchemaTypes, Types } from "mongoose";

export interface AbcSchema {
	name: string;
	autofill?: {
		enabled?: boolean;
	};
	someNumbers: number[];
	songs: { _id: Types.ObjectId }[];
	restrictedName?: string;
	aNumber: number;
}

export const schema = new Schema<AbcSchema>({
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
