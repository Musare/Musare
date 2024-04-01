import Job, { JobOptions } from "@/Job";
import EventsModule from "@/modules/EventsModule";

const channelRegex =
	/^(?<moduleName>[a-z]+)\.(?<modelName>[A-z]+)\.(?<event>[A-z]+):?(?<modelId>[A-z0-9]+)?$/;

export default class Subscribe extends Job {
	protected static _hasPermission = true;

	public constructor(payload?: unknown, options?: JobOptions) {
		super(EventsModule, payload, options);
	}

	protected override async _validate() {
		if (typeof this._payload !== "object" || this._payload === null)
			throw new Error("Payload must be an object");

		if (typeof this._payload.channel !== "string")
			throw new Error("Channel must be a string");
	}

	protected override async _authorize() {
		const { channel } = this._payload;

		const { moduleName, modelName, event, modelId } =
			channelRegex.exec(channel)?.groups ?? {};

		let permission = `event.${channel}`;

		if (
			moduleName === "data" &&
			modelName &&
			(modelId || event === "created")
		) {
			if (event === "created")
				permission = `event.model.${modelName}.created`;
			else permission = `data.${modelName}.findById.${modelId}`;
		}

		await this._context.assertPermission(permission);
	}

	protected async _execute() {
		const socketId = this._context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		await EventsModule.subscribeSocket(this._payload.channel, socketId);
	}
}
