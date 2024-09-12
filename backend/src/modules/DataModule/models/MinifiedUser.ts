import {
	DataTypes,
	Model,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional
} from "sequelize";
import { ObjectIdType } from "@/modules/DataModule";
import { UserRole } from "./User/UserRole";
import { schema as userSchema } from "./User";

export class MinifiedUser extends Model<
	// eslint-disable-next-line no-use-before-define
	InferAttributes<MinifiedUser>,
	// eslint-disable-next-line no-use-before-define
	InferCreationAttributes<MinifiedUser>
> {
	declare _id: CreationOptional<ObjectIdType>;

	declare username: string;

	declare name: string;

	declare role: CreationOptional<UserRole>;

	declare createdAt: CreationOptional<Date>;

	declare updatedAt: CreationOptional<Date>;
}

export const schema = {
	_id: userSchema._id,
	username: userSchema.username,
	name: userSchema.name,
	role: userSchema.role,
	_name: {
		type: DataTypes.VIRTUAL,
		get() {
			return `minifiedUsers`;
		}
	}
};

export const options = {
	timestamps: false
};

export const setup = async () => {
	// Session.afterSave(async record => {
	// });
	// Session.afterDestroy(async record => {
	// });
};

export default MinifiedUser;

// When we get have to do more with TS, check out https://github.com/sequelize/sequelize/issues/3078#issuecomment-1226261914
