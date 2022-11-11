export default class ListenerHandler extends EventTarget {
	listeners: Record<
		string,
		{
			cb: (event: any) => void;
			options: { replaceable: boolean; modalUuid?: string };
		}[]
	>;

	constructor() {
		super();
		this.listeners = {};
	}

	addEventListener(type, cb, options) {
		// add the listener type to listeners object
		if (!(type in this.listeners)) this.listeners[type] = [];

		const stack = this.listeners[type];

		// push the callback
		stack.push({ cb, options });

		const replaceableIndexes = [];

		// check for any replaceable callbacks
		stack.forEach((element, index) => {
			if (element.options && element.options.replaceable)
				replaceableIndexes.push(index);
		});

		// should always be 1 replaceable callback remaining
		replaceableIndexes.pop();

		// delete the other replaceable callbacks
		replaceableIndexes.forEach(index => stack.splice(index, 1));
	}

	// eslint-disable-next-line consistent-return
	removeEventListener(type, cb) {
		if (!(type in this.listeners)) return true; // event type doesn't exist

		const stack = this.listeners[type];

		stack.forEach((element, index) => {
			if (element.cb === cb) stack.splice(index, 1);
		});
	}

	dispatchEvent(event) {
		if (!(event.type in this.listeners)) return true; // event type doesn't exist

		const stack = this.listeners[event.type].slice();

		stack.forEach(element => element.cb.call(this, event));

		return !event.defaultPrevented;
	}
}
