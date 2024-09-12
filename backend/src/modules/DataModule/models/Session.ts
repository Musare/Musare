import {
	DataTypes,
	Model,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	ForeignKey,
	NonAttribute,
	BelongsToCreateAssociationMixin,
	BelongsToGetAssociationMixin,
	BelongsToSetAssociationMixin,
	Association
} from "sequelize";
import { ObjectIdType } from "@/modules/DataModule";
import User from "./User";

export class Session extends Model<
	// eslint-disable-next-line no-use-before-define
	InferAttributes<Session>,
	// eslint-disable-next-line no-use-before-define
	InferCreationAttributes<Session>
> {
	declare _id: ObjectIdType;

	declare userId: ForeignKey<User["_id"]>;

	declare createdAt: CreationOptional<Date>;

	declare updatedAt: CreationOptional<Date>;

	declare getUserModel: BelongsToGetAssociationMixin<User>;

	declare setUserModel: BelongsToSetAssociationMixin<User, number>;

	declare createUserModel: BelongsToCreateAssociationMixin<User>;

	declare userModel?: NonAttribute<User>;

	declare static associations: {
		// eslint-disable-next-line no-use-before-define
		userModel: Association<Session, User>;
	};
}

export const schema = {
	_id: {
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
	Session.belongsTo(User, {
		as: "userModel",
		foreignKey: {
			name: "userId",
			type: DataTypes.OBJECTID,
			allowNull: false
		},
		onDelete: "RESTRICT",
		onUpdate: "RESTRICT"
	});

	// Session.afterSave(async record => {
	// });
	// Session.afterDestroy(async record => {
	// });
};

export default Session;
