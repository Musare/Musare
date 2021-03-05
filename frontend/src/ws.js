import Toast from "toasters";

// eslint-disable-next-line import/no-cycle
import store from "./store";

const onConnect = {
	temp: [],
	persist: []
};

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

				stack.forEach((element, index) => {
					if (element === cb) stack.splice(index, 1);
				});
			}

			dispatchEvent(event) {
				if (!(event.type in this.listeners)) return true; // event type doesn't exist

				const stack = this.listeners[event.type].slice();
				stack.forEach(element => element.call(this, event));

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
				CB_REF += 1;

				if (this.readyState !== 1)
					return onConnect.temp.push(() => this.dispatch(...args));

				const cb = args[args.length - 1];
				if (typeof cb === "function") CB_REFS[CB_REF] = cb;

				return this.send(
					JSON.stringify([...args.slice(0, -1), { CB_REF }])
				);
			}
		}

		this.socket = new CustomWebSocket("ws://localhost:8080/ws");
		store.dispatch("websockets/createSocket", this.socket);

		this.socket.onopen = () => {
			console.log("IO: SOCKET CONNECTED");

			onConnect.temp.forEach(cb => cb());
			onConnect.persist.forEach(cb => cb());
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
			setTimeout(() => this.init(), 1000);
		};

		this.socket.onerror = err => {
			console.log("WS: SOCKET ERROR", err);

			new Toast({
				content: "Cannot perform this action at this time.",
				timeout: 8000
			});
		};
	}
};
