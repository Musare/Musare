import Job, { JobOptions } from "@/Job";
import EventsModule from "@/modules/EventsModule";

export default class Unsubscribe extends Job {
	public constructor(payload?: unknown, options?: JobOptions) {
		super(EventsModule, payload, options);
	}

	protected override async _validate() {
		if (typeof this._payload !== "object" || this._payload === null)
			throw new Error("Payload must be an object");

		if (typeof this._payload.channel !== "string")
			throw new Error("Channel must be a string");
	}

	protected override async _authorize() {}

	protected async _execute() {
		const socketId = this._context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		await EventsModule.unsubscribeSocket(this._payload.channel, socketId);
	}
}
