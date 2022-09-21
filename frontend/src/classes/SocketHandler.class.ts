import ListenerHandler from "@/classes/ListenerHandler.class";
import { useUserAuthStore } from "@/stores/userAuth";
import utils from "@/utils";

export default class SocketHandler {
	socket?: WebSocket;

	url: string;

	dispatcher: ListenerHandler;

	onConnectCbs: {
		temp: ((...args: any[]) => any)[];
		persist: ((...args: any[]) => any)[];
	};

	ready: boolean;

	firstInit: boolean;

	pendingDispatches: ((...args: any[]) => any)[];

	onDisconnectCbs: {
		temp: ((...args: any[]) => any)[];
		persist: ((...args: any[]) => any)[];
	};

	CB_REFS: {
		[key: string]: (...args: any[]) => any;
	};

	PROGRESS_CB_REFS: {
		[key: string]: (...args: any[]) => any;
	};

	data: {
		dispatch?: {
			[key: string]: (...args: any[]) => any;
		};
		progress?: {
			[key: string]: (...args: any[]) => any;
		};
		on?: {
			[key: string]: any;
		};
	}; // Mock only

	executeDispatch: boolean; // Mock only

	trigger: (type: string, target: string, data?: any) => void; // Mock only

	constructor(url: string) {
		this.dispatcher = new ListenerHandler();

		this.url = url;

		this.onConnectCbs = {
			temp: [],
			persist: []
		};

		this.ready = false;
		this.firstInit = true;

		this.pendingDispatches = [];

		this.onDisconnectCbs = {
			temp: [],
			persist: []
		};

		// references for when a dispatch event is ready to callback from server to client
		this.CB_REFS = {};
		this.PROGRESS_CB_REFS = {};

		this.init();

		// Mock only
		this.data = {};
		this.executeDispatch = true;
		this.trigger = () => {};
	}

	init() {
		this.socket = new WebSocket(this.url);

		const userAuthStore = useUserAuthStore();

		this.socket.onopen = () => {
			console.log("WS: SOCKET OPENED");
		};

		this.socket.onmessage = message => {
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

		this.socket.onclose = () => {
			console.log("WS: SOCKET CLOSED");

			this.ready = false;
			this.firstInit = false;

			this.onDisconnectCbs.temp.forEach(cb => cb());
			this.onDisconnectCbs.persist.forEach(cb => cb());

			// try to reconnect every 1000ms, if the user isn't banned
			if (!userAuthStore.banned) setTimeout(() => this.init(), 1000);
		};

		this.socket.onerror = err => {
			console.log("WS: SOCKET ERROR", err);
		};

		if (this.firstInit) {
			this.firstInit = false;
			this.on("ready", () => {
				console.log("WS: SOCKET READY");

				this.onConnectCbs.temp.forEach(cb => cb());
				this.onConnectCbs.persist.forEach(cb => cb());

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

	on(
		target: string,
		cb: (...args: any[]) => any,
		options?: EventListenerOptions
	) {
		this.dispatcher.addEventListener(
			target,
			(event: CustomEvent) => cb(...event.detail),
			options
		);
	}

	dispatch(...args: [string, ...any[]]) {
		if (!this.socket || this.socket.readyState !== 1) {
			this.pendingDispatches.push(() => this.dispatch(...args));
			return undefined;
		}

		const lastArg = args[args.length - 1];
		const CB_REF = utils.guid();

		if (typeof lastArg === "function") {
			this.CB_REFS[CB_REF] = lastArg;

			return this.socket.send(
				JSON.stringify([...args.slice(0, -1), { CB_REF }])
			);
		}
		if (typeof lastArg === "object") {
			this.CB_REFS[CB_REF] = lastArg.cb;
			this.PROGRESS_CB_REFS[CB_REF] = lastArg.onProgress;

			return this.socket.send(
				JSON.stringify([
					...args.slice(0, -1),
					{ CB_REF, onProgress: true }
				])
			);
		}

		return this.socket.send(JSON.stringify([...args]));
	}

	onConnect(cb: (...args: any[]) => any, persist = false) {
		if (this.socket && this.socket.readyState === 1 && this.ready) cb();

		if (persist) this.onConnectCbs.persist.push(cb);
		else this.onConnectCbs.temp.push(cb);
	}

	onDisconnect(cb: (...args: any[]) => any, persist = false) {
		if (persist) this.onDisconnectCbs.persist.push(cb);
		else this.onDisconnectCbs.temp.push(cb);
	}

	clearCallbacks() {
		this.onConnectCbs.temp = [];
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

	destroyModalListeners(modalUuid: string) {
		// destroy all listeners for a specific modal
		Object.keys(this.dispatcher.listeners).forEach(type =>
			this.dispatcher.listeners[type].forEach((element, index) => {
				if (element.options && element.options.modalUuid === modalUuid)
					this.dispatcher.listeners[type].splice(index, 1);
			})
		);
	}
}
