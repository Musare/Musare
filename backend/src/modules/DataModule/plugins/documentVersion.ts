import { Schema, SchemaTypes } from "mongoose";

export interface DocumentVersion {
	documentVersion: number;
}

export default function documentVersionPlugin(schema: Schema) {
	schema.add({
		documentVersion: {
			type: SchemaTypes.Number,
			default: schema.get("documentVersion") ?? 1,
			required: true
		}
	});
}
