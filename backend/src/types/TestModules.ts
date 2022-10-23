import BaseModule from "../BaseModule";
import OtherModule, { OtherModuleJobs } from "../modules/OtherModule";
import StationModule, { StationModuleJobs } from "../modules/StationModule";

export type Methods<T> = {
	[P in keyof T as T[P] extends Function ? P : never]: T[P];
};

export type UniqueMethods<T> = Methods<Omit<T, keyof typeof BaseModule>>;

export type Jobs = {
	others: {
		[Property in keyof OtherModuleJobs]: OtherModuleJobs[Property];
	};
	stations: {
		[Property in keyof StationModuleJobs]: StationModuleJobs[Property];
	};
};

export type Modules = {
	others: OtherModule & typeof BaseModule;
	stations: StationModule & typeof BaseModule;
};
