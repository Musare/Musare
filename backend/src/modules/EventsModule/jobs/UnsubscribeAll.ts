import Job, { JobOptions } from "@/Job";
import EventsModule from "@/modules/EventsModule";

export default class UnsubscribeAll extends Job {
	public constructor(payload?: unknown, options?: JobOptions) {
		super(EventsModule, payload, options);
	}

	protected static _hasPermission = true;

	protected async _execute() {
		const socketId = this._context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		await EventsModule.unsubscribeAllSocket(socketId);
	}
}
