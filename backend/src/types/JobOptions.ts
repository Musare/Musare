import { SessionSchema } from "../schemas/session";

export type JobOptions = {
	priority?: number;
	longJob?: string;
	session?: SessionSchema;
	socketId?: string;
};
