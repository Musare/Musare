import Joi from "joi";
import User from "@models/User";
import bcrypt from "bcrypt";
import sha256 from "sha256";
import isLoggedOut from "@/modules/DataModule/permissions/isLoggedOut";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";
import { UserRole } from "@models/User/UserRole";
import { UserAvatarType } from "../UserAvatarType";
import { UserAvatarColor } from "../UserAvatarColor";

// TODO: Disable registration if configured as such
export default class Register extends DataModuleJob {
	protected static _model = User;

	protected static _hasPermission = isLoggedOut;

	protected static _payloadSchema = Joi.object({
		query: Joi.object({
			username: Joi.string().min(2).max(32).regex(/^_*[a-zA-Z0-9][a-zA-Z0-9_]*$/).required()
				.external(async (username: string) => {
					const user = await User.findOne({
						where: { username }
					});

					if (user instanceof User)
						throw new Error("A user with that username already exists.");
				}, "unique"),
			// TODO: Whitelist regex
			emailAddress: Joi.string().email().min(3).max(254).required()
				.external(async (emailAddress: string) => {
					const user = await User.findOne({
						where: { emailAddress }
					});

					if (user instanceof User)
						throw new Error("A user with that email already exists.");
				}, "unique"),
			password: Joi.string().min(6).max(200).required(), // TODO: format validation
		}).required()
	});

	protected async _execute() {
		const { query } = this._payload;

		const user = new User();
		user.name = query.username;
		user.username = query.username;
		user.emailAddress = query.emailAddress;
		user.password = await bcrypt.hash(
			sha256(query.password),
			await bcrypt.genSalt(10)
		);
		user.role = UserRole.USER;
		user.avatarType = UserAvatarType.INITIALS;
		user.avatarColor = Object.values(UserAvatarColor)[
			Math.floor(
				Math.random() * Object.values(UserAvatarColor).length
			)
		];
		await user.save();

		const session = await user.createSessionModel();

		return {
			sessionId: session._id
		};
	}
}
