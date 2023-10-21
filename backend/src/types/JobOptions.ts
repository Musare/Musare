import { SessionSchema } from "@/models/schemas/session";

export type JobOptions = {
	priority?: number;
	longJob?: string;
	session?: SessionSchema;
	socketId?: string;
};
