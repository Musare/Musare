import Event from "@/modules/EventsModule/Event";

type EventConstructorParameters = ConstructorParameters<typeof Event>;

export interface EventDerived extends Event {
	new (...args: EventConstructorParameters): Event & typeof Event;
}
