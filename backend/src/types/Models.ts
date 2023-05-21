import { Model, InferSchemaType } from "mongoose";
import { AbcSchema } from "../models/abc";

export type Schemas = {
	abc: AbcSchema;
};

export type Models = Record<
	keyof Schemas,
	Model<InferSchemaType<Schemas[keyof Schemas]>>
>;
