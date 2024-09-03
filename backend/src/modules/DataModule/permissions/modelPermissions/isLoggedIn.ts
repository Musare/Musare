import { HydratedDocument, Schema } from "mongoose";
import User from "../../models/User";

export default <ModelSchemaType extends Schema>(
	model: HydratedDocument<ModelSchemaType>,
	user?: User
) => !!user;
