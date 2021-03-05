import Toast from "toasters";

// eslint-disable-next-line import/no-cycle
import store from "./store";

const callbacks = {
	general: {
		temp: [],
		persist: []
	},
	onConnect: {
		temp: [],
		persist: []
	},
	onDisconnect: {
		temp: [],
		persist: []
	}
};

const callbackss = {};
let callbackRef = 0;

export default {
	socket: null,
	dispatcher: null,

	getSocket(...args) {
		if (args[0] === true) {
			if (this.socket && this.socket.readyState === 1) {
				args[1](this.socket);
			} else callbacks.general.persist.push(args[1]);
		} else if (this.socket && this.socket.readyState === 1) {
			args[0](this.socket);
		} else callbacks.general.temp.push(args[0]);
	},

	onConnect(...args) {
		if (args[0] === true) callbacks.onConnect.persist.push(args[1]);
		else callbacks.onConnect.temp.push(args[0]);
	},

	onDisconnect(...args) {
		if (args[0] === true) callbacks.onDisconnect.persist.push(args[1]);
		else callbacks.onDisconnect.temp.push(args[0]);
	},

	clear: () => {
		Object.keys(callbacks).forEach(type => {
			callbacks[type].temp = [];
		});
	},

	removeAllListeners() {
		Object.keys(callbackss).forEach(id => {
			if (
				id.indexOf("$event:") !== -1 &&
				id.indexOf("$event:keep.") === -1
			)
				delete callbackss[id];
		});
	},

	init() {
		class ListenerHandler extends EventTarget {
			constructor() {
				super();
				this.listeners = {};
			}

			addEventListener(type, cb) {
				if (!(type in this.listeners)) this.listeners[type] = []; // add the listener type to listeners object
				this.listeners[type].push(cb); // push the callback
			}

			// eslint-disable-next-line consistent-return
			removeEventListener(type, cb) {
				if (!(type in this.listeners)) return true; // event type doesn't exist

				const stack = this.listeners[type];

				for (let i = 0, l = stack.length; i < l; i += 1)
					if (stack[i] === cb) stack.splice(i, 1);
			}

			dispatchEvent(event) {
				if (!(event.type in this.listeners)) return true; // event type doesn't exist

				const stack = this.listeners[event.type].slice();

				for (let i = 0, l = stack.length; i < l; i += 1)
					stack[i].call(this, event);

				return !event.defaultPrevented;
			}
		}

		class CustomWebSocket extends WebSocket {
			constructor(url) {
				super(url);
				this.dispatcher = new ListenerHandler();
			}

			on(target, cb) {
				this.dispatcher.addEventListener(target, event =>
					cb(...event.detail)
				);
			}

			dispatch(...args) {
				callbackRef += 1;

				if (this.readyState !== 1)
					return new Toast({
						content: "Cannot perform this action at this time.",
						timeout: 8000
					});

				const cb = args[args.length - 1];
				if (typeof cb === "function") callbackss[callbackRef] = cb;

				return this.send(
					JSON.stringify([...args.slice(0, -1), { callbackRef }])
				);
			}
		}

		this.socket = new CustomWebSocket("ws://localhost:8080/ws");
		store.dispatch("websockets/createSocket", this.socket);

		this.socket.onopen = () => {
			callbacks.onConnect.temp.forEach(cb => cb());
			callbacks.onConnect.persist.forEach(cb => cb());

			console.log("IO: SOCKET CONNECTED");

			callbacks.general.temp.forEach(cb => cb(this.socket));
			callbacks.general.persist.forEach(cb => cb(this.socket));

			callbacks.general.temp = [];
			callbacks.general.persist = [];
		};

		this.socket.onmessage = message => {
			const data = JSON.parse(message.data);
			const name = data.shift(0);

			if (name === "callbackRef") {
				const callbackRef = data.shift(0);
				callbackss[callbackRef](...data);
				return delete callbackss[callbackRef];
			}

			return this.socket.dispatcher.dispatchEvent(
				new CustomEvent(name, {
					detail: data
				})
			);
		};

		this.socket.onclose = () => {
			console.log("IO: SOCKET DISCONNECTED");

			callbacks.onDisconnect.temp.forEach(cb => cb());
			callbacks.onDisconnect.persist.forEach(cb => cb());

			// try to reconnect every 1000ms
			setTimeout(() => {
				this.init();
			}, 1000);
		};

		this.socket.onerror = err => {
			console.log("IO: SOCKET ERROR", err);

			new Toast({
				content: "Cannot perform this action at this time.",
				timeout: 8000
			});
		};
	}
};
