import { Model, Schema, SchemaTypes, Types } from "mongoose";
import { BaseSchema } from "@/types/Schemas";

export interface SessionSchema extends BaseSchema {
	userId: Types.ObjectId;
}

export type SessionModel = Model<SessionSchema>;

export const schema = new Schema<SessionSchema, SessionModel>(
	{
		userId: {
			type: SchemaTypes.ObjectId,
			ref: "users",
			required: true
		}
	},
	{ patchHistory: { enabled: false } }
);

export type SessionSchemaType = typeof schema;
