import DataModule, { DataModuleJobs } from "../modules/DataModule";
import StationModule, { StationModuleJobs } from "../modules/StationModule";
import BaseModule from "../BaseModule";

export type Module = BaseModule;

export type ModuleClass<Module extends typeof BaseModule> = {
	new (): Module;
};

export type Jobs = {
	data: {
		[Property in keyof DataModuleJobs]: DataModuleJobs[Property];
	};
	stations: {
		[Property in keyof StationModuleJobs]: StationModuleJobs[Property];
	};
};

export type Modules = {
	data: DataModule & typeof BaseModule;
	stations: StationModule & typeof BaseModule;
};

export type ModuleStatus =
	| "LOADED"
	| "STARTING"
	| "STARTED"
	| "STOPPED"
	| "STOPPING"
	| "ERROR"
	| "DISABLED";

export type Methods<T> = {
	[P in keyof T as T[P] extends (...args: any) => Awaited<any>
		? P
		: never]: T[P];
};

export type UniqueMethods<T> = Methods<Omit<T, keyof BaseModule>>;
