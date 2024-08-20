import { forEachIn } from "@common/utils/forEachIn";
import Joi from "joi";
import Job, { JobOptions } from "@/Job";
import EventsModule from "@/modules/EventsModule";
import Event from "../Event";

import { channelRegex } from "./Subscribe";

export default class SubscribeMany extends Job {
	protected static _hasPermission = true;

	protected static _payloadSchema = Joi.object({
		channels: Joi.array()
			.items(Joi.string().pattern(channelRegex).required())
			.min(1)
			.required()
	});

	public constructor(payload?: unknown, options?: JobOptions) {
		super(EventsModule, payload, options);
	}

	protected override async _authorize() {
		// Channel could be data.news.created, or something like data.news.updated:SOME_OBJECT_ID
		await forEachIn(this._payload.channels, async channel => {
			// Path can be for example data.news.created. Scope will be anything after ":", but isn't required, so could be undefined
			const { path, scope } = Event.parseKey(channel);

			const permission = scope
				? `event.${path}:${scope}`
				: `event.${path}`;

			await EventsModule.assertPermission(this._context, permission);
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
