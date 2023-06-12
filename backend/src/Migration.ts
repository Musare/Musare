import { Connection } from "mongoose";

export default class Migration {
	private _mongoConnection: Connection;

	constructor(mongoConnection: Connection) {
		this._mongoConnection = mongoConnection;
	}

	protected getDb() {
		return this._mongoConnection.db;
	}

	public async up() {}

	public async down() {}
}
