import { Model } from "sequelize";
import User from "../../models/User";

export default (model: Model, user?: User) => !!user;
