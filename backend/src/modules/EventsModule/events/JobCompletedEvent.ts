import EventsModule from "@/modules/EventsModule";
import ModuleEvent from "../ModuleEvent";

export default class JobCompletedEvent extends ModuleEvent {
	protected static _module = EventsModule;

	protected static _name = "job.completed";
}
