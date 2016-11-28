let callbacks = [];

export default {

	ready: false,
	authenticated: false,
	role: 'default',

	getStatus: function(cb) {
		if (this.ready) {
			cb(this.authenticated, this.role);
		} else {
			callbacks.push(cb);
		}
	},

	data: function(authenticated, role) {
		this.authenticated = authenticated;
		this.role = role;
		this.ready = true;
		callbacks.forEach((callback) => {
			callback(authenticated, role);
		});
		callbacks = [];
	}
}