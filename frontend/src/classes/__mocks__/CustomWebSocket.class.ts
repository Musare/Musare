import ListenerHandler from "@/classes/ListenerHandler.class";

export default class CustomWebSocketMock {
	dispatcher: ListenerHandler;

	url: string;

	data: {
		dispatch?: any;
		onProgress?: any[];
		progressInterval?: number;
	};

	onDisconnectCbs: {
		temp: any[];
		persist: any[];
	};

	constructor(url) {
		this.dispatcher = new ListenerHandler();
		this.url = url;
		this.data = {
			dispatch: {},
			onProgress: [{}],
			progressInterval: 10
		};
		this.onDisconnectCbs = {
			temp: [],
			persist: []
		};
	}

	on(target, cb, options?) {
		this.dispatcher.addEventListener(
			target,
			event => cb(event.detail),
			options
		);
	}

	dispatch(target, ...args) {
		const lastArg = args[args.length - 1];

		if (typeof lastArg === "function") {
			if (this.data.dispatch && this.data.dispatch[target])
				lastArg(this.data.dispatch[target]);
		} else if (typeof lastArg === "object") {
			if (this.data.onProgress && this.data.onProgress[target])
				this.data.onProgress[target].forEach(data =>
					setInterval(
						() => lastArg.onProgress(data),
						this.data.progressInterval || 0
					)
				);
			if (this.data.dispatch && this.data.dispatch[target])
				lastArg.cb(this.data.dispatch[target]);
		}
	}

	// eslint-disable-next-line class-methods-use-this
	onConnect(cb) {
		cb();
	}

	onDisconnect(...args) {
		if (args[0] === true) this.onDisconnectCbs.persist.push(args[1]);
		else this.onDisconnectCbs.temp.push(args[0]);

		this.dispatcher.addEventListener(
			"socket.disconnect",
			() => {
				this.onDisconnectCbs.temp.forEach(cb => cb());
				this.onDisconnectCbs.persist.forEach(cb => cb());
			},
			false
		);
	}

	clearCallbacks() {
		this.onDisconnectCbs.temp = [];
	}

	// eslint-disable-next-line class-methods-use-this
	destroyModalListeners() {}

	triggerEvent(target, data) {
		this.dispatcher.dispatchEvent(
			new CustomEvent(target, {
				detail: data
			})
		);
	}
}
