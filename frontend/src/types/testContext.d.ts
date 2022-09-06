import { VueWrapper } from "@vue/test-utils";

declare module "vitest" {
	export interface TestContext {
		longJobsStore?: any; // TODO use long job store type
		wrapper?: VueWrapper;
	}
}
