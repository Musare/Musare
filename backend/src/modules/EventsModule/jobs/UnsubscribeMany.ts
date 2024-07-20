import Job, { JobOptions } from "@/Job";
import EventsModule from "@/modules/EventsModule";

export default class UnsubscribeMany extends Job {
	public constructor(payload?: unknown, options?: JobOptions) {
		super(EventsModule, payload, options);
	}

	protected static _hasPermission = true;

	protected override async _validate() {
		if (typeof this._payload !== "object" || this._payload === null)
			throw new Error("Payload must be an object");

		if (!Array.isArray(this._payload.channels))
			throw new Error("Channels must be an array");

		this._payload.channels.forEach((channel: unknown) => {
			if (typeof channel !== "string")
				throw new Error("Channel must be a string");
		});
	}

	protected async _execute() {
		const socketId = this._context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		await EventsModule.unsubscribeManySocket(
			this._payload.channels,
			socketId
		);
	}
}
