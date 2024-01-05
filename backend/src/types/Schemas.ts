import { Types } from "mongoose";
import { NewsSchemaType } from "@models/news/schema";
import { SessionSchemaType } from "@models/sessions/schema";
import { StationSchemaType } from "@models/stations/schema";
import { UserSchemaType } from "@models/users/schema";
import { AbcSchemaType } from "@models/abc/schema";
import { DocumentVersion } from "@/modules/DataModule/plugins/documentVersion";

// eslint-disable-next-line
export interface BaseSchema extends DocumentVersion, TimestampsSchema {
	_id: Types.ObjectId;
}

export interface TimestampsSchema {
	createdAt: number;
	updatedAt: number;
}

export type Schemas = {
	abc: AbcSchemaType;
	news: NewsSchemaType;
	sessions: SessionSchemaType;
	stations: StationSchemaType;
	users: UserSchemaType;
};
