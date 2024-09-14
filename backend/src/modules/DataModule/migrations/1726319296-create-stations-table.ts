import { Sequelize, DataTypes } from "sequelize";
import { MigrationParams } from "umzug";

export const up = async ({
	context: sequelize
}: MigrationParams<Sequelize>) => {
	await sequelize.getQueryInterface().createTable("stations", {
		_id: {
			// eslint-disable-next-line
			// @ts-ignore 
			type: DataTypes.OBJECTID,
			primaryKey: true,
			allowNull: false
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true
		},
		type: {
			type: DataTypes.ENUM("official", "community"),
			allowNull: false
		},
		displayName: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true
		},
		description: {
			type: DataTypes.STRING,
			allowNull: false
		},
		paused: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
			allowNull: false
		},
		currentSongIndex: {
			type: DataTypes.SMALLINT,
			defaultValue: 0,
			allowNull: false
		},
		timePaused: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
			allowNull: false
		},
		pausedAt: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
			allowNull: false
		},
		startedAt: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
			allowNull: false
		},
		privacy: {
			type: DataTypes.ENUM("public", "unlisted", "private"),
			defaultValue: "private",
			allowNull: false
		},
		owner: {
			// eslint-disable-next-line
			// @ts-ignore
			type: DataTypes.OBJECTID,
			allowNull: true
		},
		theme: {
			type: DataTypes.ENUM("blue", "purple", "teal", "orange", "red"),
			defaultValue: "blue",
			allowNull: false
		},
		skipVoteThreshold: {
			type: DataTypes.SMALLINT,
			defaultValue: 50,
			allowNull: false
		},
		createdAt: DataTypes.DATE,
		updatedAt: DataTypes.DATE
	});

	await sequelize.getQueryInterface().addConstraint("stations", {
		type: "foreign key",
		fields: ["owner"],
		references: {
			table: "users",
			field: "_id"
		},
		onDelete: "RESTRICT",
		onUpdate: "RESTRICT"
	});
	// TODO add other constraints/pivots
};

export const down = async ({
	context: sequelize
}: MigrationParams<Sequelize>) => {
	await sequelize.getQueryInterface().dropTable("stations");
};
