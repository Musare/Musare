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
	InferAttributes<Session>,
	InferCreationAttributes<Session>
> {
	declare sessionId: ObjectIdType;

	declare userId: ForeignKey<User["_id"]>;

	declare createdAt: CreationOptional<Date>;

	declare updatedAt: CreationOptional<Date>;

	declare getUserModel: BelongsToGetAssociationMixin<User>;

	declare setUserModel: BelongsToSetAssociationMixin<User, number>;

	declare createUserModel: BelongsToCreateAssociationMixin<User>;

	declare userModel?: NonAttribute<User>;

	declare static associations: {
		userModel: Association<Session, User>;
	};
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
