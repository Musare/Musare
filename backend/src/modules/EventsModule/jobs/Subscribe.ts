import Job, { JobOptions } from "@/Job";
import EventsModule from "@/modules/EventsModule";
import Event from "../Event";

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

		const { path, scope } = Event.parseKey(channel);

		const EventClass = EventsModule.getEvent(path);

		const hasPermission = await EventClass.hasPermission(
			await this._context.getUser().catch(() => null),
			scope
		);

		if (!hasPermission)
			throw new Error(`Insufficient permissions for event ${channel}`);
	}

	protected async _execute() {
		const socketId = this._context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		await EventsModule.subscribeSocket(this._payload.channel, socketId);
	}
}
