let callbacks = [];

export default {

	ready: false,
	authenticated: false,
	username: '',
	userId: '',
	role: 'default',

	getStatus: function (cb) {
		if (this.ready) cb(this.authenticated, this.role, this.username, this.userId);
		else callbacks.push(cb);
	},

	data: function (authenticated, role, username, userId) {
		this.authenticated = authenticated;
		this.role = role;
		this.username = username;
		this.userId = userId;
		this.ready = true;
		callbacks.forEach(callback => {
			callback(authenticated, role, username, userId);
		});
		callbacks = [];
	}
}