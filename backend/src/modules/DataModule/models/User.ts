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
import { UserAvatarColor } from "./User/UserAvatarColor";
import { UserAvatarType } from "./User/UserAvatarType";
import News from "./News";
import Session from "./Session";
import { ObjectIdType } from "@/modules/DataModule";

export class User extends Model<
	// eslint-disable-next-line no-use-before-define
	InferAttributes<User>,
	// eslint-disable-next-line no-use-before-define
	InferCreationAttributes<User>
> {
	declare _id: CreationOptional<ObjectIdType>;

	declare username: string;

	declare role: UserRole;

	declare emailVerified: CreationOptional<boolean>;

	declare emailVerificationToken: CreationOptional<string | null>;

	declare emailAddress: string;

	declare avatarType: UserAvatarType;

	declare avatarUrl: CreationOptional<string | null>;

	declare avatarColor: CreationOptional<UserAvatarColor | null>;

	// Services
	declare password: CreationOptional<string | null>;

	declare passwordResetCode: CreationOptional<string | null>;

	declare passwordResetExpiresAt: CreationOptional<Date | null>;

	declare passwordSetCode: CreationOptional<string | null>;

	declare passwordSetExpiresAt: CreationOptional<Date | null>;

	declare githubId: CreationOptional<number | null>;

	declare githubAccessToken: CreationOptional<string | null>;
	// End services

	// Statistics
	declare songsRequested: CreationOptional<number>;
	// End statistics

	// declare likedSongsPlaylist: Types.ObjectId;

	// declare dislikedSongsPlaylist: Types.ObjectId;

	// declare favoriteStations: Types.ObjectId[];

	declare name: string;

	declare location: CreationOptional<string | null>;

	declare bio: CreationOptional<string | null>;

	// Preferences
	// declare orderOfPlaylists: Types.ObjectId[];

	declare nightmode: CreationOptional<boolean>;

	declare autoSkipDisliked: CreationOptional<boolean>;

	declare activityLogPublic: CreationOptional<boolean>;

	declare anonymousSongRequests: CreationOptional<boolean>;

	declare activityWatch: CreationOptional<boolean>;
	// End preferences

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
		// eslint-disable-next-line no-use-before-define
		sessionModels: Association<User, Session>;
		// eslint-disable-next-line no-use-before-define
		createdNewsModels: Association<User, News>;
	};
}

// TODO add validation
export const schema = {
	_id: {
		type: DataTypes.OBJECTID,
		autoNull: false,
		primaryKey: true
	},
	username: {
		type: DataTypes.STRING,
		allowNull: false
	},
	role: {
		type: DataTypes.ENUM(...Object.values(UserRole)),
		allowNull: false
	},
	emailVerified: {
		type: DataTypes.BOOLEAN,
		allowNull: true,
		defaultValue: false
	},
	emailVerificationToken: {
		type: DataTypes.STRING,
		allowNull: true
	},
	emailAddress: {
		type: DataTypes.STRING,
		allowNull: false
	},
	avatarType: {
		type: DataTypes.ENUM(...Object.values(UserAvatarType)),
		allowNull: false
	},
	avatarUrl: {
		type: DataTypes.STRING,
		allowNull: true
	},
	avatarColor: {
		type: DataTypes.ENUM(...Object.values(UserAvatarColor)),
		allowNull: true
	},
	password: {
		type: DataTypes.STRING,
		allowNull: true
	},
	passwordResetCode: {
		type: DataTypes.STRING,
		allowNull: true
	},
	passwordResetExpiresAt: {
		type: DataTypes.DATE,
		allowNull: true
	},
	passwordSetCode: {
		type: DataTypes.STRING,
		allowNull: true
	},
	passwordSetExpiresAt: {
		type: DataTypes.DATE,
		allowNull: true
	},
	githubId: {
		type: DataTypes.BIGINT,
		allowNull: true
	},
	githubAccessToken: {
		type: DataTypes.STRING,
		allowNull: true
	},
	songsRequested: {
		type: DataTypes.BIGINT,
		allowNull: false,
		defaultValue: 0
	},
	name: {
		type: DataTypes.STRING,
		allowNull: false
	},
	location: {
		type: DataTypes.STRING,
		allowNull: true
	},
	bio: {
		type: DataTypes.STRING,
		allowNull: true
	},
	nightmode: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: false
	},
	autoSkipDisliked: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: true
	},
	activityLogPublic: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: false
	},
	anonymousSongRequests: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: false
	},
	activityWatch: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: false
	},
	createdAt: DataTypes.DATE,
	updatedAt: DataTypes.DATE,
	hasPassword: {
		type: DataTypes.BOOLEAN,
		readonly: true
	},
	_name: {
		type: DataTypes.VIRTUAL,
		get() {
			return `users`;
		}
	},
	// Temporary
	favoriteStations: {
		type: DataTypes.VIRTUAL,
		get() {
			return [];
		}
	}
};

export const options = {
	defaultScope: {
		attributes: {
			exclude: [
				"emailVerificationToken",
				"password",
				"passwordResetCode",
				"passwordSetCode",
				"githubAccessToken"
			]
		}
	}
};

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

	User.addHook("beforeDestroy", async (record: User, options) => {
		await Session.destroy({
			where: {
				userId: user._id
			},
			individualHooks: true,
			transaction: options.transaction
		});
	});
};

export default User;
