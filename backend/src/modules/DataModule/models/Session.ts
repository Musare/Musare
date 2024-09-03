import {
	DataTypes,
	Model,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional
} from "sequelize";
import { ObjectIdType } from "@/modules/DataModule";

export class Session extends Model<
	InferAttributes<Session>,
	InferCreationAttributes<Session>
> {
	declare sessionId: ObjectIdType;

	declare userId: number;

	declare createdAt: CreationOptional<Date>;

	declare updatedAt: CreationOptional<Date>;
}

export const schema = {
	sessionId: {
		type: DataTypes.OBJECTID,
		allowNull: false,
		primaryKey: true
	},
	userId: {
		type: DataTypes.OBJECTID,
		allowNull: false
	},
	createdAt: DataTypes.DATE,
	updatedAt: DataTypes.DATE,
	_name: {
		type: DataTypes.VIRTUAL,
		get() {
			return `session`;
		}
	}
};

export const options = {};

export const setup = async () => {
	// Session.afterSave(async record => {
	// });
	// Session.afterDestroy(async record => {
	// });
};

export default Session;
