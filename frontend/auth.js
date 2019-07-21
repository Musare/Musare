let callbacks = [];
let bannedCallbacks = [];

export default {
	ready: false,
	authenticated: false,
	username: "",
	userId: "",
	role: "default",
	banned: null,
	ban: {},

	getStatus: function(cb) {
		if (this.ready)
			cb(this.authenticated, this.role, this.username, this.userId);
		else callbacks.push(cb);
	},

	setBanned: function(ban) {
		let _this = this;
		_this.banned = true;
		_this.ban = ban;
		bannedCallbacks.forEach(callback => {
			callback(true, _this.ban);
		});
	},

	isBanned: function(cb) {
		if (this.ready) return cb(false);
		if (!this.ready && this.banned === true) return cb(true, this.ban);
		bannedCallbacks.push(cb);
	},

	data: function(authenticated, role, username, userId) {
		this.authenticated = authenticated;
		this.role = role;
		this.username = username;
		this.userId = userId;
		this.ready = true;
		callbacks.forEach(callback => {
			callback(authenticated, role, username, userId);
		});
		bannedCallbacks.forEach(callback => {
			callback(false);
		});
		callbacks = [];
	}
};
