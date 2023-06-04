import { Model, Schema, SchemaTypes, Types } from "mongoose";
import { BaseSchema } from "../types/Schemas";

export interface SessionSchema extends BaseSchema {
	userId: Types.ObjectId;
	socketIds: string[];
}

export type SessionModel = Model<SessionSchema>;

export const schema = new Schema<SessionSchema, SessionModel>({
	userId: {
		type: SchemaTypes.ObjectId,
		ref: "user",
		required: true
	},
	socketIds: [SchemaTypes.String]
});

export type SessionSchemaType = typeof schema;
