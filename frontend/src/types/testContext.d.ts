import { VueWrapper } from "@vue/test-utils";

declare module "vitest" {
	export interface TestContext {
		longJobsStore?: any; // TODO use long job store type
		wrapper?: VueWrapper;
		mockSocket?: {
			data?: {
				dispatch?: {
					[key: string]: (...args: any[]) => any;
				};
				progress?: {
					[key: string]: (...args: any[]) => any;
				};
				on?: {
					[key: string]: any;
				};
			};
			executeDispatch?: boolean;
		};
	}
}
