import { HydratedDocument } from "mongoose";
import User from "../../models/User";

export default (
	model:
		| (HydratedDocument<any> & { owner?: any })
		| (HydratedDocument<any> & { createdBy?: any }),
	user?: User
) => {
	if (!user || !model) return false;

	let ownerAttribute;

	if (model.schema.path("createdBy")) ownerAttribute = "createdBy";
	else if (model.schema.path("owner")) ownerAttribute = "owner";

	if (ownerAttribute)
		return model.get(ownerAttribute)?.toString() === user._id.toString();

	return false;
};
