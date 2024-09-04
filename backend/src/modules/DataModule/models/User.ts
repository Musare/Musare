import {
	DataTypes,
	Model,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional
} from "sequelize";
import { UserRole } from "./User/UserRole";
import { ObjectIdType } from "@/modules/DataModule";

export class User extends Model<
	InferAttributes<User>,
	InferCreationAttributes<User>
> {
	declare _id: CreationOptional<ObjectIdType>;

	declare username: string;

	declare name: string;

	declare role: CreationOptional<UserRole>;

	declare createdAt: CreationOptional<Date>;

	declare updatedAt: CreationOptional<Date>;
}

export const schema = {
	_id: {
		type: DataTypes.OBJECTID,
		primaryKey: true,
		allowNull: false
	},
	username: {
		type: DataTypes.STRING,
		allowNull: false
	},
	name: {
		type: DataTypes.STRING,
		allowNull: false
	},
	role: {
		type: DataTypes.ENUM(...Object.values(UserRole)),
		defaultValue: UserRole.USER,
		allowNull: false
	},
	// createdBy: {
	// 	type: DataTypes.OBJECTID,
	// 	allowNull: false
	// },
	createdAt: DataTypes.DATE,
	updatedAt: DataTypes.DATE,
	_name: {
		type: DataTypes.VIRTUAL,
		get() {
			return `users`;
		}
	}
};

export const options = {};

export const setup = async () => {
	// User.afterSave(async record => {});

	// User.afterDestroy(async record => {});

	User.addHook("afterFind", (user, options) => {
		console.log("AFTER FIND USER", user, options);
	});
};

export default User;
