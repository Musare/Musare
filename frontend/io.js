let callbacks = [];
let onConnectCallbacks = [];
let onDisconnectCallbacks = [];
let onConnectErrorCallbacks = [];

export default {

	ready: false,
	socket: null,

	getSocket: function (cb) {
		if (this.ready) cb(this.socket);
		else callbacks.push(cb);
	},

	onConnect: (cb) => {
		onConnectCallbacks.push(cb);
	},

	onDisconnect: (cb) => {
		onDisconnectCallbacks.push(cb);
	},

	onConnectError: (cb) => {
		onConnectErrorCallbacks.push(cb);
	},

	removeAllListeners: function () {
		Object.keys(this.socket._callbacks).forEach((id) => {
			if (id.indexOf("$event:song") !== -1) {
				delete this.socket._callbacks[id];
			}
		});
	},

	init: function (url) {
		this.socket = window.socket = io(url);
		this.socket.on('connect', () => {
			// Connect
			onConnectCallbacks.forEach((cb) => {
				cb();
			});
		});
		this.socket.on('disconnect', () => {
			// Disconnect
			onDisconnectCallbacks.forEach((cb) => {
				cb();
			});
		});
		this.socket.on('connect_error', () => {
			// Connect error
			onConnectErrorCallbacks.forEach((cb) => {
				cb();
			});
		});
		this.ready = true;
		callbacks.forEach(callback => {
			callback(this.socket);
		});
		callbacks = [];
	}
}