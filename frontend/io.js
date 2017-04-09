let callbacks = [];
let callbacksPersist = [];
let onConnectCallbacks = [];
let onDisconnectCallbacks = [];
let onConnectErrorCallbacks = [];
let onConnectCallbacksPersist = [];
let onDisconnectCallbacksPersist = [];
let onConnectErrorCallbacksPersist = [];

export default {

	ready: false,
	socket: null,

	getSocket: function () {
		if (arguments[0] === true) {
			if (this.ready) arguments[1](this.socket);
			else callbacksPersist.push(arguments[1]);
		} else {
			if (this.ready) arguments[0](this.socket);
			else callbacks.push(arguments[0]);
		}
	},

	onConnect: function() {
		if (arguments[0] === true) {
			onConnectCallbacksPersist.push(arguments[1]);
		} else onConnectCallbacks.push(arguments[0]);
	},

	onDisconnect: function() {
		if (arguments[0] === true) {
			onDisconnectCallbacksPersist.push(arguments[1]);
		} else onDisconnectCallbacks.push(arguments[0]);
	},

	onConnectError: function() {
		if (arguments[0] === true) {
			onConnectErrorCallbacksPersist.push(arguments[1]);
		} else onConnectErrorCallbacks.push(arguments[0]);
	},

	clear: () => {
		onConnectCallbacks = [];
		onDisconnectCallbacks = [];
		onConnectErrorCallbacks = [];
		callbacks = [];
	},

	removeAllListeners: function () {
		Object.keys(this.socket._callbacks).forEach((id) => {
			if (id.indexOf("$event:") !== -1 && id.indexOf("$event:keep.") === -1) {
				delete this.socket._callbacks[id];
			}
		});
	},

	init: function (url) {
		this.socket = window.socket = io(url);
		this.socket.on('connect', () => {
			onConnectCallbacks.forEach((cb) => {
				cb();
			});
			onConnectCallbacksPersist.forEach((cb) => {
				cb();
			});
		});
		this.socket.on('disconnect', () => {
			console.log("IO: SOCKET DISCONNECTED");
			onDisconnectCallbacks.forEach((cb) => {
				cb();
			});
			onDisconnectCallbacksPersist.forEach((cb) => {
				cb();
			});
		});
		this.socket.on('connect_error', () => {
			console.log("IO: SOCKET CONNECT ERROR");
			onConnectErrorCallbacks.forEach((cb) => {
				cb();
			});
			onConnectErrorCallbacksPersist.forEach((cb) => {
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
}
