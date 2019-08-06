let callbacks = [];
let callbacksPersist = [];
let onConnectCallbacks = [];
let onDisconnectCallbacks = [];
let onConnectErrorCallbacks = [];
const onConnectCallbacksPersist = [];
const onDisconnectCallbacksPersist = [];
const onConnectErrorCallbacksPersist = [];

export default {
	ready: false,
	socket: null,

	getSocket(...args) {
		if (args[0] === true) {
			if (this.ready) args[1](this.socket);
			else callbacksPersist.push(args[1]);
		} else if (this.ready) args[0](this.socket);
		else callbacks.push(args[0]);
	},

	onConnect(...args) {
		if (args[0] === true) {
			onConnectCallbacksPersist.push(args[1]);
		} else onConnectCallbacks.push(args[0]);
	},

	onDisconnect(...args) {
		if (args[0] === true) {
			onDisconnectCallbacksPersist.push(args[1]);
		} else onDisconnectCallbacks.push(args[0]);
	},

	onConnectError(...args) {
		if (args[0] === true) {
			onConnectErrorCallbacksPersist.push(args[1]);
		} else onConnectErrorCallbacks.push(args[0]);
	},

	clear: () => {
		onConnectCallbacks = [];
		onDisconnectCallbacks = [];
		onConnectErrorCallbacks = [];
		callbacks = [];
	},

	removeAllListeners() {
		Object.keys(this.socket._callbacks).forEach(id => {
			if (
				id.indexOf("$event:") !== -1 &&
				id.indexOf("$event:keep.") === -1
			) {
				delete this.socket._callbacks[id];
			}
		});
	},

	init(url) {
		/* eslint-disable-next-line no-undef */
		this.socket = window.socket = io(url);
		this.socket.on("connect", () => {
			onConnectCallbacks.forEach(cb => {
				cb();
			});
			onConnectCallbacksPersist.forEach(cb => {
				cb();
			});
		});
		this.socket.on("disconnect", () => {
			console.log("IO: SOCKET DISCONNECTED");
			onDisconnectCallbacks.forEach(cb => {
				cb();
			});
			onDisconnectCallbacksPersist.forEach(cb => {
				cb();
			});
		});
		this.socket.on("connect_error", () => {
			console.log("IO: SOCKET CONNECT ERROR");
			onConnectErrorCallbacks.forEach(cb => {
				cb();
			});
			onConnectErrorCallbacksPersist.forEach(cb => {
				cb();
			});
		});
		this.ready = true;
		callbacks.forEach(callback => {
			callback(this.socket);
		});

		callbacksPersist.forEach(callback => {
			callback(this.socket);
		});
		callbacks = [];
		callbacksPersist = [];
	}
};
