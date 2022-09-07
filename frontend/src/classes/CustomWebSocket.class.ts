import ListenerHandler from "@/classes/ListenerHandler.class";
import { useUserAuthStore } from "@/stores/userAuth";

export default class CustomWebSocket extends WebSocket {
	dispatcher: ListenerHandler;

	onConnectCbs: any[];

	ready: boolean;

	firstInit: boolean;

	pendingDispatches: any[];

	onDisconnectCbs: {
		temp: any[];
		persist: any[];
	};

	CB_REF: number;

	CB_REFS: object;

	PROGRESS_CB_REFS: object;

	constructor(url) {
		super(url);

		this.dispatcher = new ListenerHandler();

		this.onConnectCbs = [];
		this.ready = false;
		this.firstInit = true;

		this.pendingDispatches = [];

		this.onDisconnectCbs = {
			temp: [],
			persist: []
		};

		// references for when a dispatch event is ready to callback from server to client
		this.CB_REF = 0;
		this.CB_REFS = {};
		this.PROGRESS_CB_REFS = {};

		this.init();
	}

	init() {
		const userAuthStore = useUserAuthStore();

		this.onopen = () => {
			console.log("WS: SOCKET OPENED");
		};

		this.onmessage = message => {
			const data = JSON.parse(message.data);
			const name = data.shift(0);

			if (name === "CB_REF") {
				const CB_REF = data.shift(0);
				this.CB_REFS[CB_REF](...data);
				return delete this.CB_REFS[CB_REF];
			}
			if (name === "PROGRESS_CB_REF") {
				const PROGRESS_CB_REF = data.shift(0);
				this.PROGRESS_CB_REFS[PROGRESS_CB_REF](...data);
			}

			if (name === "ERROR") console.log("WS: SOCKET ERROR:", data[0]);

			return this.dispatcher.dispatchEvent(
				new CustomEvent(name, {
					detail: data
				})
			);
		};

		this.onclose = () => {
			console.log("WS: SOCKET CLOSED");

			this.ready = false;

			this.onDisconnectCbs.temp.forEach(cb => cb());
			this.onDisconnectCbs.persist.forEach(cb => cb());

			// try to reconnect every 1000ms, if the user isn't banned
			if (!userAuthStore.banned) setTimeout(() => this.init(), 1000);
		};

		this.onerror = err => {
			console.log("WS: SOCKET ERROR", err);
		};

		if (this.firstInit) {
			this.firstInit = false;
			this.on("ready", () => {
				console.log("WS: SOCKET READY");

				this.onConnectCbs.forEach(cb => cb());

				this.ready = true;

				setTimeout(() => {
					// dispatches that were attempted while the server was offline
					this.pendingDispatches.forEach(cb => cb());
					this.pendingDispatches = [];
				}, 150); // small delay between readyState being 1 and the server actually receiving dispatches

				userAuthStore.updatePermissions();
			});
		}
	}

	on(target, cb, options?) {
		this.dispatcher.addEventListener(
			target,
			event => cb(...event.detail),
			options
		);
	}

	dispatch(...args) {
		if (this.readyState !== 1)
			return this.pendingDispatches.push(() => this.dispatch(...args));

		const lastArg = args[args.length - 1];

		if (typeof lastArg === "function") {
			this.CB_REF += 1;
			this.CB_REFS[this.CB_REF] = lastArg;

			return this.send(
				JSON.stringify([...args.slice(0, -1), { CB_REF: this.CB_REF }])
			);
		}
		if (typeof lastArg === "object") {
			this.CB_REF += 1;
			this.CB_REFS[this.CB_REF] = lastArg.cb;
			this.PROGRESS_CB_REFS[this.CB_REF] = lastArg.onProgress;

			return this.send(
				JSON.stringify([
					...args.slice(0, -1),
					{ CB_REF: this.CB_REF, onProgress: true }
				])
			);
		}

		return this.send(JSON.stringify([...args]));
	}

	onConnect(cb) {
		if (this.readyState === 1 && this.ready) cb();

		return this.onConnectCbs.push(cb);
	}

	onDisconnect(...args) {
		if (args[0] === true) this.onDisconnectCbs.persist.push(args[1]);
		else this.onDisconnectCbs.temp.push(args[0]);
	}

	clearCallbacks() {
		this.onDisconnectCbs.temp = [];
	}

	destroyListeners() {
		Object.keys(this.CB_REFS).forEach(id => {
			if (
				id.indexOf("$event:") !== -1 &&
				id.indexOf("$event:keep.") === -1
			)
				delete this.CB_REFS[id];
		});

		Object.keys(this.PROGRESS_CB_REFS).forEach(id => {
			if (
				id.indexOf("$event:") !== -1 &&
				id.indexOf("$event:keep.") === -1
			)
				delete this.PROGRESS_CB_REFS[id];
		});

		// destroy all listeners that aren't site-wide
		Object.keys(this.dispatcher.listeners).forEach(type => {
			if (type.indexOf("keep.") === -1 && type !== "ready")
				delete this.dispatcher.listeners[type];
		});
	}

	destroyModalListeners(modalUuid) {
		// destroy all listeners for a specific modal
		Object.keys(this.dispatcher.listeners).forEach(type =>
			this.dispatcher.listeners[type].forEach((element, index) => {
				if (element.options && element.options.modalUuid === modalUuid)
					this.dispatcher.listeners[type].splice(index, 1);
			})
		);
	}
}
