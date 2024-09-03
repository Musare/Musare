import User from "../models/User";
import { UserRole } from "../models/User/UserRole";

export default (user: User) => user && user.role === UserRole.ADMIN;
