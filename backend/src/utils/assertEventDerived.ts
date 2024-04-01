import Event from "@/modules/EventsModule/Event";

// eslint-disable-next-line @typescript-eslint/ban-types
export default (EventClass: Event) => {
	// Make sure the provided EventClass has Event as the parent somewhere as a parent. Not Event itself, as that constructor requires an additional constructor parameter
	// So any class that extends Event, or that extends another class that extends Event, will be allowed.
	let classPrototype = Object.getPrototypeOf(EventClass);
	while (classPrototype) {
		if (classPrototype === Event) break;
		classPrototype = Object.getPrototypeOf(classPrototype);
	}
	if (!classPrototype)
		throw new Error("Provided event class is not a event.");
};
