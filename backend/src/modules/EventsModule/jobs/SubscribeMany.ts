import Job from "@/Job";
import EventsModule from "@/modules/EventsModule";
import { JobOptions } from "@/types/JobOptions";

export default class SubscribeMany extends Job {
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
		await Promise.all(
			this._payload.channels.map(async (channel: string) => {
				const [, moduleName, modelName, event, modelId] =
					/^([a-z]+)\.([a-z]+)\.([A-z]+)\.?([A-z0-9]+)?$/.exec(
						channel
					) ?? [];

				let permission = `event.${channel}`;

				if (
					moduleName === "model" &&
					modelName &&
					(modelId || event === "created")
				) {
					if (event === "created")
						permission = `event.model.${modelName}.created`;
					else permission = `data.${modelName}.findById.${modelId}`;
				}

				await this._context.assertPermission(permission);
			})
		);
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
