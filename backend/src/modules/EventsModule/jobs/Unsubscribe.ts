import Job from "@/Job";
import EventsModule from "@/modules/EventsModule";
import { JobOptions } from "@/types/JobOptions";

export default class Unsubscribe extends Job {
	public constructor(
		payload?: any,
		options?: Omit<JobOptions, "runDirectly">
	) {
		super(EventsModule, payload, options);
	}

	protected override async _validate() {
		if (typeof this._payload !== "object")
			throw new Error("Payload must be an object");

		if (typeof this._payload.channel !== "string")
			throw new Error("Channel must be a string");
	}

	protected override async _authorize() {}

	protected async _execute({ channel }: { channel: string }) {
		const socketId = this._context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		await EventsModule.unsubscribeSocket(channel, socketId);
	}
}
