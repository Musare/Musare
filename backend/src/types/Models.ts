import { Model, InferSchemaType, Schema } from "mongoose";
import { AbcSchema } from "../schemas/abc";

export type Schemas = {
	abc: Schema<AbcSchema>;
};

export type Models = Record<
	keyof Schemas,
	Model<InferSchemaType<Schemas[keyof Schemas]>>
>;
