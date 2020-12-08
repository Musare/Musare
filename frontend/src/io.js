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

export default {
	ready: false,

	socket: null,

	getSocket(...args) {
		if (args[0] === true) {
			if (this.ready) args[1](this.socket);
			else callbacks.general.persist.push(args[1]);
		} else if (this.ready) args[0](this.socket);
		else callbacks.general.temp.push(args[0]);
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
		Object.keys(this.socket._callbacks).forEach(id => {
			if (
				id.indexOf("$event:") !== -1 &&
				id.indexOf("$event:keep.") === -1
			)
				delete this.socket._callbacks[id];
		});
	},

	init(url) {
		/* eslint-disable-next-line no-undef */
		this.socket = window.socket = io(url);

		this.socket.on("connect", () => {
			callbacks.onConnect.temp.forEach(cb => cb());
			callbacks.onConnect.persist.forEach(cb => cb());
		});

		this.socket.on("disconnect", () => {
			console.log("IO: SOCKET DISCONNECTED");
			callbacks.onDisconnect.temp.forEach(cb => cb());
			callbacks.onDisconnect.persist.forEach(cb => cb());
		});

		this.socket.on("connect_error", () => {
			console.log("IO: SOCKET CONNECT ERROR");
			callbacks.onConnectError.temp.forEach(cb => cb());
			callbacks.onConnectError.persist.forEach(cb => cb());
		});

		this.socket.on("error", err => {
			console.log("IO: SOCKET ERROR", err);
			new Toast({
				content: err,
				timeout: 8000
			});
		});

		this.ready = true;

		callbacks.general.temp.forEach(callback => callback(this.socket));
		callbacks.general.persist.forEach(callback => callback(this.socket));

		callbacks.general.temp = [];
		callbacks.general.persist = [];
	}
};
