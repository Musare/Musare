export default (model, user) =>
	model && user && model.djs.includes(user._id.toString());
