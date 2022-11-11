import { VueWrapper } from "@vue/test-utils";

declare module "vitest" {
	export interface TestContext {
		longJobsStore?: any; // TODO use long job store type
		wrapper?: VueWrapper;
		mockSocket?: {
			data?: {
				dispatch?: Record<string, (...args: any[]) => any>;
				progress?: Record<string, (...args: any[]) => any>;
				on?: Record<string, any>;
			};
			executeDispatch?: boolean;
		};
	}
}
