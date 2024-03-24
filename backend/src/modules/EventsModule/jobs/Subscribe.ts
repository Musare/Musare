import Job, { JobOptions } from "@/Job";
import EventsModule from "@/modules/EventsModule";

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

	protected override async _authorize() {}

	// protected override async _authorize() {
	// const [path, scope] = this._payload.channel.split(":");

	// const EventClass = EventsModule.getEvent(path);

	// const hasPermission = EventClass.hasPermission(
	// 	this._context.getUser(),
	// 	scope
	// );
	// }

	protected async _execute() {
		const socketId = this._context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		await EventsModule.subscribeSocket(this._payload.channel, socketId);
	}
}
