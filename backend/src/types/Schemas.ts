import { DocumentVersion } from "../schemas/plugins/documentVersion";
import { AbcSchemaType } from "../schemas/abc";
import { NewsSchemaType } from "../schemas/news";
import { StationSchemaType } from "../schemas/station";

// eslint-disable-next-line
export interface BaseSchema extends DocumentVersion {}

export interface TimestampsSchema {
	createdAt: number;
	updatedAt: number;
}

export type Schemas = {
	abc: AbcSchemaType;
	news: NewsSchemaType;
	station: StationSchemaType;
};
