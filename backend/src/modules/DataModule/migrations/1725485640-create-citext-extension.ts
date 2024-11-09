import { Sequelize, DataTypes } from "sequelize";
import { MigrationParams } from "umzug";

export const up = async ({
	context: sequelize
}: MigrationParams<Sequelize>) => {
	await sequelize.query(
		"CREATE EXTENSION citext"
	);
};

export const down = async ({
	context: sequelize
}: MigrationParams<Sequelize>) => {
	await sequelize.query(
		"DROP EXTENSION citext"
	);
};
