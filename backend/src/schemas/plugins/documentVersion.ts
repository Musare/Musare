import { Schema, SchemaOptions, SchemaTypes } from "mongoose";

export interface DocumentVersionSchemaOptions extends SchemaOptions {
	documentVersion: number;
}

export interface DocumentVersion {
	documentVersion: number;
}

export default function documentVersionPlugin(schema: Schema) {
	schema.add({
		documentVersion: {
			type: SchemaTypes.Number,
			default: schema.options?.documentVersion ?? 1,
			required: true
		}
	});
}
