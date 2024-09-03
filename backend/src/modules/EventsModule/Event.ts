import User from "../DataModule/models/User";

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

	protected static _hasPermission:
		| boolean
		| CallableFunction
		| (boolean | CallableFunction)[] = false;

	// Check if a given user has generic permission to subscribe to an event, using _hasPermission
	public static async hasPermission(user: User | null) {
		const options = Array.isArray(this._hasPermission)
			? this._hasPermission
			: [this._hasPermission];

		return options.reduce(async (previous, option) => {
			if (await previous) return true;

			if (typeof option === "boolean") return option;

			if (typeof option === "function") return option(user);

			return false;
		}, Promise.resolve(false));
	}
}

export type EventClass = {
	new (...params: ConstructorParameters<typeof Event>): Event;
} & typeof Event;
