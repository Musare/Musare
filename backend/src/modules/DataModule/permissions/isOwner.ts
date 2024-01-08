import { HydratedDocument, Schema, Types } from "mongoose";
import { UserSchema } from "../models/users/schema";

export default <
	ModelSchemaType extends Schema & {
		createdBy?: Types.ObjectId;
		owner?: Types.ObjectId;
	}
>(
	model: HydratedDocument<ModelSchemaType>,
	user?: HydratedDocument<UserSchema>
) => {
	if (!(user && model)) return false;

	let ownerAttribute;

	if (model.schema.path("createdBy")) ownerAttribute = "createdBy";
	else if (model.schema.path("owner")) ownerAttribute = "owner";

	if (ownerAttribute)
		return model.get(ownerAttribute)?.toString() === user._id.toString();

	return false;
};
