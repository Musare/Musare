import { Sequelize, DataTypes } from "sequelize";
import { MigrationParams } from "umzug";

export const up = async ({
	context: sequelize
}: MigrationParams<Sequelize>) => {
	await sequelize.getQueryInterface().createTable("sessions", {
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
		updatedAt: DataTypes.DATE
	});

	await sequelize.getQueryInterface().addConstraint("sessions", {
		type: "foreign key",
		fields: ["userId"],
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
	await sequelize.getQueryInterface().dropTable("sessions");
};
