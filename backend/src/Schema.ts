import { Attribute } from "./types/Attribute";
import { Document } from "./types/Document";

export enum Types {
	String,
	Number,
	Date,
	Boolean,
	ObjectId,
	Array,
	// Map,
	Schema
}

export const createAttribute = ({
	type,
	required,
	restricted,
	item,
	schema,
	defaultValue,
	unique,
	min,
	max,
	enumValues
}: Partial<Attribute> & { type: Attribute["type"] }) => ({
	type,
	required: required ?? true,
	restricted: restricted ?? false,
	item,
	schema,
	defaultValue,
	unique: unique ?? false,
	min,
	max,
	enumValues
});

export default class Schema {
	private document: Document;

	private timestamps: boolean;

	private version: number;

	public constructor(schema: {
		document: Document;
		timestamps?: boolean;
		version?: number;
	}) {
		this.document = {
			_id: createAttribute({ type: Types.ObjectId }),
			...schema.document
		};
		this.timestamps = schema.timestamps ?? true;
		this.version = schema.version ?? 1;

		if (this.timestamps) {
			this.document.createdAt = createAttribute({
				type: Types.Date
			});
			this.document.updatedAt = createAttribute({
				type: Types.Date
			});
		}
	}

	public getDocument() {
		return this.document;
	}

	public getVersion() {
		return this.version;
	}
}
