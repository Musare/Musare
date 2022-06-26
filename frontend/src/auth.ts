let callbacks = [];
const bannedCallbacks = [];

export default {
	ready: false,
	authenticated: false,
	username: "",
	userId: "",
	role: "default",
	banned: null,
	ban: {},

	getStatus(cb) {
		if (this.ready)
			cb(this.authenticated, this.role, this.username, this.userId);
		else callbacks.push(cb);
	},

	setBanned(ban) {
		this.banned = true;
		this.ban = ban;
		bannedCallbacks.forEach(callback => {
			callback(true, this.ban);
		});
	},

	isBanned(cb) {
		if (this.ready) return cb(false);
		if (!this.ready && this.banned === true) return cb(true, this.ban);
		return bannedCallbacks.push(cb);
	},

	data(authenticated, role, username, userId) {
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
