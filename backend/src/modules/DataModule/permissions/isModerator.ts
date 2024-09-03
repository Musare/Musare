import { UserRole } from "../models/User/UserRole";
import User from "../models/User";

export default (user: User) => user && user.role === UserRole.ADMIN;
