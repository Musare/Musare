import { Model } from "sequelize";
import User from "../../models/User";

export default (
	model: (Model & { owner?: any }) | (Model & { createdBy?: any }),
	user?: User
) => {
	if (!user || !model) return false;

	let ownerAttribute;

	if (model.dataValues.hasOwnProperty("createdBy"))
		ownerAttribute = "createdBy";
	else if (model.dataValues.hasOwnProperty("owner")) ownerAttribute = "owner";

	if (ownerAttribute)
		return (
			model.dataValues[ownerAttribute].toString() === user._id.toString()
		);

	return false;
};
