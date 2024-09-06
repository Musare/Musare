import {
	DataTypes,
	Model,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	HasManyAddAssociationMixin,
	HasManyCountAssociationsMixin,
	HasManyCreateAssociationMixin,
	HasManyGetAssociationsMixin,
	HasManyHasAssociationMixin,
	HasManySetAssociationsMixin,
	HasManyAddAssociationsMixin,
	HasManyHasAssociationsMixin,
	HasManyRemoveAssociationMixin,
	HasManyRemoveAssociationsMixin,
	NonAttribute,
	Association
} from "sequelize";
import { UserRole } from "./User/UserRole";
import { ObjectIdType } from "@/modules/DataModule";
import Session from "./Session";
import News from "./News";

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

	declare getSessionModels: HasManyGetAssociationsMixin<Session>;

	declare addSessionModel: HasManyAddAssociationMixin<Session, number>;

	declare addSessionModels: HasManyAddAssociationsMixin<Session, number>;

	declare setSessionModels: HasManySetAssociationsMixin<Session, number>;

	declare removeSessionModel: HasManyRemoveAssociationMixin<Session, number>;

	declare removeSessionModels: HasManyRemoveAssociationsMixin<
		Session,
		number
	>;

	declare hasSessionModel: HasManyHasAssociationMixin<Session, number>;

	declare hasSessionModels: HasManyHasAssociationsMixin<Session, number>;

	declare countSessionModels: HasManyCountAssociationsMixin;

	declare createSessionModel: HasManyCreateAssociationMixin<
		Session,
		"userId"
	>;

	declare sessionModels?: NonAttribute<Session[]>;

	declare getCreatedNewsModels: HasManyGetAssociationsMixin<News>;

	declare addCreatedNewsModel: HasManyAddAssociationMixin<News, number>;

	declare addCreatedNewsModels: HasManyAddAssociationsMixin<News, number>;

	declare setCreatedNewsModels: HasManySetAssociationsMixin<News, number>;

	declare removeCreatedNewsModel: HasManyRemoveAssociationMixin<News, number>;

	declare removeCreatedNewsModels: HasManyRemoveAssociationsMixin<
		News,
		number
	>;

	declare hasCreatedNewsModel: HasManyHasAssociationMixin<News, number>;

	declare hasCreatedNewsModels: HasManyHasAssociationsMixin<News, number>;

	declare countCreatedNewsModels: HasManyCountAssociationsMixin;

	declare createCreatedNewsModel: HasManyCreateAssociationMixin<
		News,
		"createdBy"
	>;

	declare createdNewsModels?: NonAttribute<News[]>;

	declare static associations: {
		sessionModels: Association<User, Session>;
		createdNewsModels: Association<User, News>;
	};
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
	User.hasMany(Session, {
		as: "sessionModels",
		foreignKey: {
			name: "userId",
			type: DataTypes.OBJECTID,
			allowNull: false
		},
		onDelete: "RESTRICT",
		onUpdate: "RESTRICT"
	});

	User.hasMany(News, {
		as: "createdNewsModels",
		foreignKey: {
			name: "createdBy",
			type: DataTypes.OBJECTID,
			allowNull: false
		},
		onDelete: "RESTRICT",
		onUpdate: "RESTRICT"
	});

	// User.afterSave(async record => {});

	// User.afterDestroy(async record => {});

	User.addHook("afterFind", (user, options) => {
		console.log("AFTER FIND USER", user, options);
	});
};

export default User;
