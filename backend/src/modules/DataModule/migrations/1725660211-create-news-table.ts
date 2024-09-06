import { Sequelize, DataTypes } from "sequelize";
import { MigrationParams } from "umzug";

export const up = async ({
	context: sequelize
}: MigrationParams<Sequelize>) => {
	await sequelize.getQueryInterface().createTable("news", {
		_id: {
			type: DataTypes.OBJECTID,
			allowNull: false,
			primaryKey: true
		},
		title: {
			type: DataTypes.STRING,
			allowNull: false
		},
		markdown: {
			type: DataTypes.TEXT,
			allowNull: false
		},
		status: {
			type: DataTypes.ENUM("draft", "published", "archived"),
			defaultValue: "draft",
			allowNull: false
		},
		showToNewUsers: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
			allowNull: false
		},
		createdBy: {
			type: DataTypes.OBJECTID,
			allowNull: false
		},
		createdAt: DataTypes.DATE,
		updatedAt: DataTypes.DATE,
	});

	await sequelize.getQueryInterface().addConstraint("news", {
		type: "foreign key",
		fields: ["createdBy"],
		references: {
			table: "users",
			field: "_id"
		},
		onDelete: "RESTRICT",
		onUpdate: "RESTRICT"
	});
};

export const down = async ({
	context: sequelize
}: MigrationParams<Sequelize>) => {
	await sequelize.getQueryInterface().dropTable("news");
};
