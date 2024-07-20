import { HydratedDocument } from "mongoose";
import { UserSchema } from "../models/users/schema";

export default (user: HydratedDocument<UserSchema>) => user;
