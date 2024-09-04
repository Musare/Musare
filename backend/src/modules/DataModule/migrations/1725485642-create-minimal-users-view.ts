import { Sequelize, QueryTypes } from "sequelize";
import { MigrationParams } from "umzug";

export const up = async ({
	context: sequelize
}: MigrationParams<Sequelize>) => {
	// TODO: Remove this when sync is no longer used
	await sequelize.getQueryInterface().dropTable("minifiedUsers");

	await sequelize.query(
		'CREATE VIEW "minifiedUsers" AS SELECT _id, username, name, role FROM users',
		{
			raw: true,
			type: QueryTypes.RAW
		}
	);
};

export const down = async ({
	context: sequelize
}: MigrationParams<Sequelize>) => {
	await sequelize.query('DROP VIEW IF EXISTS "minifiedUsers"', {
		raw: true,
		type: QueryTypes.RAW
	});
};
