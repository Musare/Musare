import { forEachIn } from "@common/utils/forEachIn";
import Job, { JobOptions } from "@/Job";
import EventsModule from "@/modules/EventsModule";
import Event from "../Event";

const channelRegex =
	/^(?<moduleName>[a-z]+)\.(?<modelName>[A-z]+)\.(?<event>[A-z]+):?(?<modelId>[A-z0-9]+)?$/;

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
		await forEachIn(this._payload.channels, async channel => {
			const { path, scope } = Event.parseKey(channel);

			const EventClass = EventsModule.getEvent(path);

			await EventClass.hasPermission(
				await this._context.getUser().catch(() => null),
				scope
			);
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
