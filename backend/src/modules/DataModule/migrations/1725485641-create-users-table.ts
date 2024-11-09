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
			primaryKey: true,
			unique: true
		},
		username: {
			type: DataTypes.CITEXT,
			allowNull: false,
			unique: true
		},
		role: {
			type: DataTypes.ENUM("admin", "moderator", "user"),
			allowNull: false
		},
		emailVerified: {
			type: DataTypes.BOOLEAN,
			allowNull: true,
			defaultValue: false
		},
		emailVerificationToken: {
			type: DataTypes.STRING,
			allowNull: true,
			unique: true
		},
		emailAddress: {
			type: DataTypes.CITEXT,
			allowNull: false,
			unique: true
		},
		avatarType: {
			type: DataTypes.ENUM("gravatar", "initials"),
			allowNull: false
		},
		avatarUrl: {
			type: DataTypes.STRING,
			allowNull: true
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
		password: {
			type: DataTypes.STRING,
			allowNull: true
		},
		passwordResetCode: {
			type: DataTypes.STRING,
			allowNull: true,
			unique: true
		},
		passwordResetExpiresAt: {
			type: DataTypes.DATE,
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
		updatedAt: DataTypes.DATE
	});

	await sequelize.query(
		"ALTER TABLE users " +
			'ADD COLUMN "hasPassword" ' +
			"BOOLEAN GENERATED ALWAYS AS " +
			'("password" IS NOT NULL) ' +
			"STORED"
	);
};

export const down = async ({
	context: sequelize
}: MigrationParams<Sequelize>) => {
	await sequelize.getQueryInterface().dropTable("users");
};
