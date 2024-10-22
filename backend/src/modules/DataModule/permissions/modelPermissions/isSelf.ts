import User from "@models/User";

export default (model?: User, user?: User) =>
	model && user && model._id === user._id;
