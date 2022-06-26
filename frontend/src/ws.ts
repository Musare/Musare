// eslint-disable-next-line import/no-cycle
import store from "./store";
import ListenerHandler from "./classes/ListenerHandler.class";

const onConnect = [];
let ready = false;
let firstInit = true;

let pendingDispatches = [];

const onDisconnect = {
	temp: [],
	persist: []
};

// references for when a dispatch event is ready to callback from server to client
const CB_REFS = {};
let CB_REF = 0;

const PROGRESS_CB_REFS = {};

export default {
	socket: null,
	dispatcher: null,

	onConnect(cb) {
		if (this.socket.readyState === 1 && ready) cb();

		return onConnect.push(cb);
	},

	onDisconnect(...args) {
		if (args[0] === true) onDisconnect.persist.push(args[1]);
		else onDisconnect.temp.push(args[0]);
	},

	clearCallbacks: () => {
		onDisconnect.temp = [];
	},

	destroyListeners() {
		Object.keys(CB_REFS).forEach(id => {
			if (
				id.indexOf("$event:") !== -1 &&
				id.indexOf("$event:keep.") === -1
			)
				delete CB_REFS[id];
		});

		Object.keys(PROGRESS_CB_REFS).forEach(id => {
			if (
				id.indexOf("$event:") !== -1 &&
				id.indexOf("$event:keep.") === -1
			)
				delete PROGRESS_CB_REFS[id];
		});

		// destroy all listeners that aren't site-wide
		Object.keys(this.socket.dispatcher.listeners).forEach(type => {
			if (type.indexOf("keep.") === -1 && type !== "ready")
				delete this.socket.dispatcher.listeners[type];
		});
	},

	destroyModalListeners(modalUuid) {
		// destroy all listeners for a specific modal
		Object.keys(this.socket.dispatcher.listeners).forEach(type =>
			this.socket.dispatcher.listeners[type].forEach((element, index) => {
				if (element.options && element.options.modalUuid === modalUuid)
					this.socket.dispatcher.listeners[type].splice(index, 1);
			})
		);
	},

	init(url) {
		// ensures correct context of socket object when dispatching (because socket object is recreated on reconnection)
		const waitForConnectionToDispatch = (...args) =>
			this.socket.dispatch(...args);

		class CustomWebSocket extends WebSocket {
			dispatcher: ListenerHandler;

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
				if (this.readyState !== 1)
					return pendingDispatches.push(() =>
						waitForConnectionToDispatch(...args)
					);

				const lastArg = args[args.length - 1];

				if (typeof lastArg === "function") {
					CB_REF += 1;
					CB_REFS[CB_REF] = lastArg;

					return this.send(
						JSON.stringify([...args.slice(0, -1), { CB_REF }])
					);
				}
				if (typeof lastArg === "object") {
					CB_REF += 1;
					CB_REFS[CB_REF] = lastArg.cb;
					PROGRESS_CB_REFS[CB_REF] = lastArg.onProgress;

					return this.send(
						JSON.stringify([
							...args.slice(0, -1),
							{ CB_REF, onProgress: true }
						])
					);
				}

				return this.send(JSON.stringify([...args]));
			}
		}

		this.socket = new CustomWebSocket();
		store.dispatch("websockets/createSocket", this.socket);

		this.socket.onopen = () => {
			console.log("WS: SOCKET OPENED");
		};

		this.socket.onmessage = message => {
			const data = JSON.parse(message.data);
			const name = data.shift(0);

			if (name === "CB_REF") {
				const CB_REF = data.shift(0);
				CB_REFS[CB_REF](...data);
				return delete CB_REFS[CB_REF];
			}
			if (name === "PROGRESS_CB_REF") {
				const PROGRESS_CB_REF = data.shift(0);
				PROGRESS_CB_REFS[PROGRESS_CB_REF](...data);
			}

			if (name === "ERROR") console.log("WS: SOCKET ERROR:", data[0]);

			return this.socket.dispatcher.dispatchEvent(
				new CustomEvent(name, {
					detail: data
				})
			);
		};

		this.socket.onclose = () => {
			console.log("WS: SOCKET CLOSED");

			ready = false;

			onDisconnect.temp.forEach(cb => cb());
			onDisconnect.persist.forEach(cb => cb());

			// try to reconnect every 1000ms
			setTimeout(() => this.init(url), 1000);
		};

		this.socket.onerror = err => {
			console.log("WS: SOCKET ERROR", err);
		};

		if (firstInit) {
			firstInit = false;
			this.socket.on("ready", () => {
				console.log("WS: SOCKET READY");

				onConnect.forEach(cb => cb());

				ready = true;

				setTimeout(() => {
					// dispatches that were attempted while the server was offline
					pendingDispatches.forEach(cb => cb());
					pendingDispatches = [];
				}, 150); // small delay between readyState being 1 and the server actually receiving dispatches
			});
		}
	}
};
