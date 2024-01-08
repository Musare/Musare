import { SessionSchema } from "@models/sessions/schema";

export type JobOptions = {
	priority?: number;
	longJob?: string;
	session?: SessionSchema;
	socketId?: string;
	callbackRef?: string;
};
