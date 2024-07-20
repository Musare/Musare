import { HydratedDocument, Schema } from "mongoose";
import { UserSchema } from "../../models/users/schema";

export default <ModelSchemaType extends Schema>(
	model: HydratedDocument<ModelSchemaType>,
	user?: HydratedDocument<UserSchema>
) => !!user;
