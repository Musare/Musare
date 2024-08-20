import Joi from "joi";
import Job, { JobOptions } from "@/Job";
import EventsModule from "@/modules/EventsModule";
import { channelRegex } from "./Subscribe";

export default class Unsubscribe extends Job {
	protected static _payloadSchema = Joi.object({
		channel: Joi.string().pattern(channelRegex).required()
	});

	public constructor(payload?: unknown, options?: JobOptions) {
		super(EventsModule, payload, options);
	}

	protected static _hasPermission = true;

	protected async _execute() {
		const socketId = this._context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		await EventsModule.unsubscribeSocket(this._payload.channel, socketId);
	}
}
