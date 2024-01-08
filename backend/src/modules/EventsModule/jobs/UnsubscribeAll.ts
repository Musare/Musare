import Job from "@/Job";
import EventsModule from "@/modules/EventsModule";
import { JobOptions } from "@/types/JobOptions";

export default class UnsubscribeAll extends Job {
	public constructor(payload?: unknown, options?: JobOptions) {
		super(EventsModule, payload, options);
	}

	protected override async _authorize() {}

	protected async _execute() {
		const socketId = this._context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		await EventsModule.unsubscribeAllSocket(socketId);
	}
}
