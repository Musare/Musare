import { Sequelize, DataTypes } from "sequelize";
import { MigrationParams } from "umzug";

export const up = async ({
	context: sequelize
}: MigrationParams<Sequelize>) => {
	await sequelize.getQueryInterface().createTable("users", {
		_id: {
			// eslint-disable-next-line
			// @ts-ignore
			type: DataTypes.OBJECTID,
			autoNull: false,
			primaryKey: true
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false
		},
		username: {
			type: DataTypes.STRING,
			allowNull: false
		},
		role: {
			type: DataTypes.ENUM("admin", "moderator", "user"),
			allowNull: false
		},
		emailAddress: {
			type: DataTypes.STRING,
			allowNull: false
		},
		emailVerifiedAt: {
			type: DataTypes.DATE,
			allowNull: true
		},
		emailVerificationToken: {
			type: DataTypes.STRING,
			allowNull: true
		},
		avatarType: {
			type: DataTypes.ENUM("gravatar", "initials"),
			allowNull: false
		},
		avatarColor: {
			type: DataTypes.ENUM(
				"blue",
				"green",
				"orange",
				"purple",
				"red",
				"teal"
			),
			allowNull: true
		},
		avatarUrl: {
			type: DataTypes.STRING,
			allowNull: true
		},
		password: {
			type: DataTypes.STRING,
			allowNull: false
		},
		passwordResetToken: {
			type: DataTypes.STRING,
			allowNull: true
		},
		passwordResetExpiresAt: {
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
		updatedAt: DataTypes.DATE
	});
};

export const down = async ({
	context: sequelize
}: MigrationParams<Sequelize>) => {
	await sequelize.getQueryInterface().dropTable("users");
};
