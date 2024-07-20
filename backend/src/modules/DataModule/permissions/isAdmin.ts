import { HydratedDocument } from "mongoose";
import { UserSchema } from "../models/users/schema";
import { UserRole } from "../models/users/UserRole";

export default (user: HydratedDocument<UserSchema>) =>
	user && user.role === UserRole.ADMIN;
