import Joi from "joi";
import User from "@models/User";
import bcrypt from "bcrypt";
import sha256 from "sha256";
import isLoggedOut from "@/modules/DataModule/permissions/isLoggedOut";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";

export default class Login extends DataModuleJob {
	protected static _model = User;

	protected static _hasPermission = isLoggedOut;

	protected static _payloadSchema = Joi.object({
		query: Joi.object({
			identifier: Joi.string().required(),
			password: Joi.string().required()
		}).required()
	});

	protected async _execute() {
		const { query } = this._payload;

		const where: Record<string, string> = {};

		if (query.identifier.includes("@")) {
			where.emailAddress = query.identifier;
		} else {
			where.username = query.identifier;
		}

		const user = await User.unscoped().findOne({
			where
		});

		if (!user) throw new Error("User not found with provided credentials");

		const isValid = await bcrypt.compare(
			sha256(query.password),
			user.password
		);

		if (!isValid)
			throw new Error("User not found with provided credentials");

		const session = await user.createSessionModel();

		return {
			sessionId: session._id
		};
	}
}
