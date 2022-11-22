// eslint-disable-next-line @typescript-eslint/no-unused-vars
import async from "async";

declare module "async" {
	// eslint-disable-next-line @typescript-eslint/ban-types
	export function waterfall<T>(tasks: Function[]): Promise<T>;
}
