import { forEachIn } from "@common/utils/forEachIn";
import Job, { JobOptions } from "@/Job";
import EventsModule from "@/modules/EventsModule";
import Event from "../Event";

export default class SubscribeMany extends Job {
	protected static _hasPermission = true;

	public constructor(payload?: unknown, options?: JobOptions) {
		super(EventsModule, payload, options);
	}

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

	protected override async _authorize() {
		// Channel could be data.news.created, or something like data.news.updated:SOME_OBJECT_ID
		await forEachIn(this._payload.channels, async channel => {
			// Path can be for example data.news.created. Scope will be anything after ":", but isn't required, so could be undefined
			const { path, scope } = Event.parseKey(channel);

			const permission = scope
				? `event.${path}.${scope}`
				: `event.${path}`;

			await EventsModule.assertPermission(permission);
		});
	}

	protected async _execute() {
		const socketId = this._context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		await EventsModule.subscribeManySocket(
			this._payload.channels,
			socketId
		);
	}
}
