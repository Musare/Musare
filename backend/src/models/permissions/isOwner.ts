export default (model, user) => {
	if (!(user && model)) return false;

	let ownerAttribute;

	if (model.schema.path("createdBy")) ownerAttribute = "createdBy";
	else if (model.schema.path("owner")) ownerAttribute = "owner";

	if (ownerAttribute)
		return model[ownerAttribute].toString() === user._id.toString();

	return false;
};
