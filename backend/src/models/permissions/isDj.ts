export default (model, user) =>
	model && user && model.djs.contains(user._id.toString());
