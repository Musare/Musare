import Joi from "joi";
import Job, { JobOptions } from "@/Job";
import EventsModule from "@/modules/EventsModule";
import Event from "@/modules/EventsModule/Event";

// TODO support more channels types if more apply
export const channelRegex = /^data\.[a-zA-Z]+\.[a-z]+(?::[A-z0-9]{24})?$/;

export default class Subscribe extends Job {
	protected static _hasPermission = true;

	protected static _payloadSchema = Joi.object({
		channel: Joi.string().pattern(channelRegex).required()
	});

	public constructor(payload?: unknown, options?: JobOptions) {
		super(EventsModule, payload, options);
	}

	protected override async _authorize() {
		// Channel could be data.news.created, or something like data.news.updated:SOME_OBJECT_ID
		const { channel } = this._payload;

		// Path can be for example data.news.created. Scope will be anything after ":", but isn't required, so could be undefined
		const { path, scope } = Event.parseKey(channel);

		const permission = scope ? `event.${path}:${scope}` : `event.${path}`;

		await EventsModule.assertPermission(this._context, permission);
	}

	protected async _execute() {
		const socketId = this._context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		await EventsModule.subscribeSocket(this._payload.channel, socketId);
	}
}
