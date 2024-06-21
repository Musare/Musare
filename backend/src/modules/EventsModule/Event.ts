import { HydratedDocument } from "mongoose";
import { UserSchema } from "@models/users/schema";
import { GetPermissionsResult } from "../DataModule/models/users/jobs/GetPermissions";
import DataModule from "../DataModule";

export default abstract class Event {
	protected static _namespace: string;

	protected static _name: string;

	protected static _type: "event" | "schedule" = "event";

	protected _data: any;

	protected _scope?: string;

	public constructor(data: any, scope?: string) {
		this._data = data;
		this._scope = scope;
	}

	public static getNamespace() {
		return this._namespace;
	}

	public static getName() {
		return this._name;
	}

	public static getPath() {
		return `${this.getNamespace()}.${this.getName()}`;
	}

	public static getKey(scope?: string) {
		const path = this.getPath();

		if (scope) return `${path}:${scope}`;

		return path;
	}

	public static parseKey(key: string) {
		const [path, scope] = key.split(":");

		return {
			path,
			scope
		};
	}

	public static getType() {
		return this._type;
	}

	public static async hasPermission(
		user: HydratedDocument<UserSchema> | null,
		scope?: string
	) {
		const GetPermissions = DataModule.getJob("users.getPermissions");

		const permissions = (await new GetPermissions({
			_id: user?._id
		}).execute()) as GetPermissionsResult;

		return !!(
			permissions[`event:${this.getKey(scope)}`] ||
			permissions[`event:${this.getPath()}:*`]
		);
	}

	public static makeMessage(data: any) {
		if (["object", "array"].includes(typeof data))
			return JSON.stringify(data);

		return data;
	}

	public static parseMessage(message: string) {
		let parsedMessage = message;

		if (parsedMessage.startsWith("[") || parsedMessage.startsWith("{"))
			try {
				parsedMessage = JSON.parse(parsedMessage);
			} catch (err) {
				console.error(err);
			}
		else if (parsedMessage.startsWith('"') && parsedMessage.endsWith('"'))
			parsedMessage = parsedMessage
				.substring(1)
				.substring(0, parsedMessage.length - 2);

		return parsedMessage;
	}

	public getNamespace() {
		return (this.constructor as typeof Event).getNamespace();
	}

	public getName() {
		return (this.constructor as typeof Event).getName();
	}

	public getPath() {
		return (this.constructor as typeof Event).getPath();
	}

	public getKey() {
		return (this.constructor as typeof Event).getKey(this._scope);
	}

	public getData() {
		return this._data;
	}

	public makeMessage() {
		return (this.constructor as typeof Event).makeMessage(this._data);
	}
}

export type EventClass = {
	new (...params: ConstructorParameters<typeof Event>): Event;
};
