import { HydratedDocument, Schema } from "mongoose";

/**
 * Simply used to check if the provided model exists.
 * Used for events/jobs where any user is allowed to access it,
 * as long as a valid object id was provided.
 */
export default <ModelSchemaType extends Schema>(
	model: HydratedDocument<ModelSchemaType>
) => !!model;
