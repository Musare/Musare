// eslint-disable-next-line import/no-cycle
import store from "./store";

const onConnect = {
	temp: [],
	persist: []
};

let pendingDispatches = [];

const onDisconnect = {
	temp: [],
	persist: []
};

// references for when a dispatch event is ready to callback from server to client
const CB_REFS = {};
let CB_REF = 0;

export default {
	socket: null,
	dispatcher: null,

	onConnect(...args) {
		if (args[0] === true) onConnect.persist.push(args[1]);
		else onConnect.temp.push(args[0]);
	},

	onDisconnect(...args) {
		if (args[0] === true) onDisconnect.persist.push(args[1]);
		else onDisconnect.temp.push(args[0]);
	},

	clear: () => {
		onConnect.temp = [];
		onDisconnect.temp = [];
	},

	removeAllListeners: () =>
		Object.keys(CB_REFS).forEach(id => {
			if (
				id.indexOf("$event:") !== -1 &&
				id.indexOf("$event:keep.") === -1
			)
				delete CB_REFS[id];
		}),

	removeModalListeners(modal) {
		Object.keys(this.socket.dispatcher.listeners).forEach(type =>
			this.socket.dispatcher.listeners[type].forEach(
				(listener, index) => {
					if (listener.options && listener.options.modal === modal)
						this.socket.dispatcher.listeners[type].splice(index, 1);
				}
			)
		);
	},

	init(url) {
		// ensures correct context of socket object when dispatching (because socket object is recreated on reconnection)
		const waitForConnectionToDispatch = (...args) =>
			this.socket.dispatch(...args);

		class ListenerHandler extends EventTarget {
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

		class CustomWebSocket extends WebSocket {
			constructor() {
				super(url);
				this.dispatcher = new ListenerHandler();
			}

			on(target, cb, options) {
				this.dispatcher.addEventListener(
					target,
					event => cb(...event.detail),
					options
				);
			}

			dispatch(...args) {
				CB_REF += 1;

				if (this.readyState !== 1)
					return pendingDispatches.push(() =>
						waitForConnectionToDispatch(...args)
					);

				const cb = args[args.length - 1];

				if (typeof cb === "function") {
					CB_REFS[CB_REF] = cb;

					return this.send(
						JSON.stringify([...args.slice(0, -1), { CB_REF }])
					);
				}

				return this.send(JSON.stringify([...args]));
			}
		}

		this.socket = new CustomWebSocket();
		store.dispatch("websockets/createSocket", this.socket);

		this.socket.onopen = () => {
			console.log("WS: SOCKET CONNECTED");

			setTimeout(() => {
				onConnect.temp.forEach(cb => cb());

				// dispatches that were attempted while the server was offline
				pendingDispatches.forEach(cb => cb());
				pendingDispatches = [];

				onConnect.persist.forEach(cb => cb());
			}, 50); // small delay between readyState being 1 and the server actually receiving dispatches
		};

		this.socket.onmessage = message => {
			const data = JSON.parse(message.data);
			const name = data.shift(0);

			if (name === "CB_REF") {
				const CB_REF = data.shift(0);
				CB_REFS[CB_REF](...data);
				return delete CB_REFS[CB_REF];
			}

			if (name === "ERROR") console.log("WS: SOCKET ERROR:", data[0]);

			return this.socket.dispatcher.dispatchEvent(
				new CustomEvent(name, {
					detail: data
				})
			);
		};

		this.socket.onclose = () => {
			console.log("WS: SOCKET DISCONNECTED");

			onDisconnect.temp.forEach(cb => cb());
			onDisconnect.persist.forEach(cb => cb());

			// try to reconnect every 1000ms
			setTimeout(() => this.init(url), 1000);
		};

		this.socket.onerror = err => {
			console.log("WS: SOCKET ERROR", err);

			// new Toast("Cannot perform this action at this time.");
		};
	}
};
