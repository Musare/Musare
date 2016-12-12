let callbacks = [];
let onConnectCallbacks = [];
let onDisconnectCallbacks = [];

export default {

	ready: false,
	socket: null,

	getSocket: function (cb) {
		if (this.ready) cb(this.socket);
		else callbacks.push(cb);
	},

	onConnect: function(cb) {
		onConnectCallbacks.push(cb);
	},

	onDisconnect: function(cb) {
		onDisconnectCallbacks.push(cb);
	},

	removeAllListeners: function() {
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
			console.log("SOCKET.IO CONNECTED");
			onConnectCallbacks.forEach((cb) => {
				cb();
			});
		});
		this.socket.on('disconnect', () => {
			// Disconnect
			console.log("SOCKET.IO DISCONNECTED");
			onDisconnectCallbacks.forEach((cb) => {
				cb();
			});
		});
		this.socket.on('connect_error', () => {
			// Connect error
			console.log("SOCKET.IO ERROR WHILE CONNECTING");
		});
		this.ready = true;
		callbacks.forEach(callback => {
			callback(this.socket);
		});
		callbacks = [];
	}
}