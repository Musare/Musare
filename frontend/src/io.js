import Toast from "toasters";

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
	},
	onConnectError: {
		temp: [],
		persist: []
	}
};

const callbackss = {};
let callbackRef = 0;

export default {
	ready: false,
	socket: null,
	dispatcher: null,

	getSocket(...args) {
		if (args[0] === true) {
			if (this.ready) {
				args[1](this.socket);
			} else callbacks.general.persist.push(args[1]);
		} else if (this.ready) {
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

	onConnectError(...args) {
		if (args[0] === true) callbacks.onDisconnect.persist.push(args[1]);
		else callbacks.onConnectError.temp.push(args[0]);
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

	init(url) {
		class CustomWebSocket extends WebSocket {
			constructor() {
				super(url);
				this.dispatcher = new EventTarget();
			}

			on(target, cb) {
				this.dispatcher.addEventListener(target, event =>
					cb(...event.detail)
				);
			}

			dispatch(...args) {
				callbackRef += 1;

				const cb = args[args.length - 1];
				if (typeof cb === "function") callbackss[callbackRef] = cb;

				this.send(
					JSON.stringify([...args.slice(0, -1), { callbackRef }])
				);
			}
		}

		this.socket = window.socket = new CustomWebSocket(url);

		this.socket.onopen = () => {
			callbacks.onConnect.temp.forEach(cb => cb());
			callbacks.onConnect.persist.forEach(cb => cb());

			this.ready = true;

			callbacks.general.temp.forEach(callback => callback(this.socket));
			callbacks.general.persist.forEach(callback =>
				callback(this.socket)
			);

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
		};

		// this.socket.on("connect_error", () => {
		// 	console.log("IO: SOCKET CONNECT ERROR");
		// 	callbacks.onConnectError.temp.forEach(cb => cb());
		// 	callbacks.onConnectError.persist.forEach(cb => cb());
		// });

		this.socket.onerror = err => {
			console.log("IO: SOCKET ERROR", err);
			new Toast({
				content: err,
				timeout: 8000
			});
		};
	}
};
