let callbacks = [];

export default {

	ready: false,
	authenticated: false,
	username: '',
	role: 'default',

	getStatus: function (cb) {
		if (this.ready) cb(this.authenticated, this.role, this.username);
		else callbacks.push(cb);
	},

	data: function (authenticated, role, username) {
		this.authenticated = authenticated;
		this.role = role;
		this.username = username;
		this.ready = true;
		callbacks.forEach(callback => {
			callback(authenticated, role, username);
		});
		callbacks = [];
	}
}