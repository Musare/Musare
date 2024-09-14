import { Model } from "sequelize";
import User from "../../models/User";

export default (
	model: (Model & { owner?: any }) | (Model & { createdBy?: any }),
	user?: User
) => {
	if (!user || !model) return false;

	let ownerAttribute;

	if (Object.prototype.hasOwnProperty.call(model.dataValues, "createdBy"))
		ownerAttribute = "createdBy";
	else if (Object.prototype.hasOwnProperty.call(model.dataValues, "owner"))
		ownerAttribute = "owner";

	if (ownerAttribute && model.dataValues[ownerAttribute])
		return (
			model.dataValues[ownerAttribute].toString() === user._id.toString()
		);

	return false;
};
