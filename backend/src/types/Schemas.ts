import { Types } from "mongoose";
import { AbcSchemaType } from "@/models/schemas/abc/schema";
import { NewsSchemaType } from "@/models/schemas/news/schema";
import { SessionSchemaType } from "@/models/schemas/session/schema";
import { StationSchemaType } from "@/models/schemas/station/schema";
import { UserSchemaType } from "@/models/schemas/user/schema";
import { DocumentVersion } from "@/models/plugins/documentVersion";

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
