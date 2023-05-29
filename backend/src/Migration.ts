import { Connection } from "mongoose";

export default class Migration {
	private mongoConnection: Connection;

	constructor(mongoConnection: Connection) {
		this.mongoConnection = mongoConnection;
	}

	protected getDb() {
		return this.mongoConnection.db;
	}

	public async up() {}

	public async down() {}
}
