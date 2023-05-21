import { Model, InferSchemaType, Schema } from "mongoose";
import { AbcSchema } from "../schemas/abc";
import { StationSchema } from "../schemas/station";

export type Schemas = {
	abc: Schema<AbcSchema>;
	station: Schema<StationSchema>;
};

export type Models = Record<
	keyof Schemas,
	Model<InferSchemaType<Schemas[keyof Schemas]>>
>;
