import Joi from "joi";
import Job, { JobOptions } from "@/Job";
import EventsModule from "@/modules/EventsModule";

import { channelRegex } from "./Subscribe";

export default class UnsubscribeMany extends Job {
	protected static _payloadSchema = Joi.object({
		channels: Joi.array()
			.items(Joi.string().pattern(channelRegex).required())
			.min(1)
			.required()
	});

	public constructor(payload?: unknown, options?: JobOptions) {
		super(EventsModule, payload, options);
	}

	protected static _hasPermission = true;

	protected async _execute() {
		const socketId = this._context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		await EventsModule.unsubscribeManySocket(
			this._payload.channels,
			socketId
		);
	}
}
