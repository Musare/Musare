import { APIModule, APIModuleJobs } from "@/modules/APIModule";
import { DataModule, DataModuleJobs } from "@/modules/DataModule";
import { EventsModule, EventsModuleJobs } from "@/modules/EventsModule";
import { StationsModule, StationsModuleJobs } from "@/modules/StationsModule";
import {
	WebSocketModule,
	WebSocketModuleJobs
} from "@/modules/WebSocketModule";
import BaseModule from "@/BaseModule";

export type Module = BaseModule;

export type ModuleClass<Module extends typeof BaseModule> = {
	new (): Module;
};

export type Jobs = {
	api: {
		[Property in keyof APIModuleJobs]: APIModuleJobs[Property];
	};
	data: {
		[Property in keyof DataModuleJobs]: DataModuleJobs[Property];
	};
	events: {
		[Property in keyof EventsModuleJobs]: EventsModuleJobs[Property];
	};
	stations: {
		[Property in keyof StationsModuleJobs]: StationsModuleJobs[Property];
	};
	websocket: {
		[Property in keyof WebSocketModuleJobs]: WebSocketModuleJobs[Property];
	};
};

export type Modules = {
	api: APIModule & typeof BaseModule;
	data: DataModule & typeof BaseModule;
	events: EventsModule & typeof BaseModule;
	stations: StationsModule & typeof BaseModule;
	websocket: WebSocketModule & typeof BaseModule;
};

export type Methods<T> = {
	[P in keyof T as T[P] extends (...args: any) => Awaited<any>
		? P
		: never]: T[P];
};

export type UniqueMethods<T> = Methods<Omit<T, keyof BaseModule>>;
