import BaseModule, { ModuleStatus } from "@/BaseModule";

export class TestModule extends BaseModule {
	public constructor() {
		super("test");

		this._status = ModuleStatus.STARTED;
	}
}
