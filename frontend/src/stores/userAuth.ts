import { defineStore } from "pinia";
import validation from "@/validation";
import ws from "@/ws";
import auth from "@/api/auth";

// TODO fix/decide eslint rule properly
// eslint-disable-next-line
export const useUserAuthStore = defineStore("userAuth", {
	state: () => ({
		userIdMap: {},
		userIdRequested: {},
		pendingUserIdCallbacks: {},
		loggedIn: false,
		role: "",
		username: "",
		email: "",
		userId: "",
		banned: false,
		ban: {},
		gotData: false
	}),
	actions: {
		register(user) {
			return new Promise((resolve, reject) => {
				const { username, email, password } = user;

				if (!email || !username || !password)
					reject(new Error("Please fill in all fields"));
				else if (!validation.isLength(email, 3, 254))
					reject(
						new Error(
							"Email must have between 3 and 254 characters."
						)
					);
				else if (
					email.indexOf("@") !== email.lastIndexOf("@") ||
					!validation.regex.emailSimple.test(email)
				)
					reject(new Error("Invalid email format."));
				else if (!validation.isLength(username, 2, 32))
					reject(
						new Error(
							"Username must have between 2 and 32 characters."
						)
					);
				else if (!validation.regex.azAZ09_.test(username))
					reject(
						new Error(
							"Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _."
						)
					);
				else if (username.replaceAll(/[_]/g, "").length === 0)
					reject(
						new Error(
							"Invalid username format. Allowed characters: a-z, A-Z, 0-9 and _, and there has to be at least one letter or number."
						)
					);
				else if (!validation.isLength(password, 6, 200))
					reject(
						new Error(
							"Password must have between 6 and 200 characters."
						)
					);
				else if (!validation.regex.password.test(password))
					reject(
						new Error(
							"Invalid password format. Must have one lowercase letter, one uppercase letter, one number and one special character."
						)
					);
				else
					auth.register(user)
						.then(res => resolve(res))
						.catch(err => reject(new Error(err.message)));
			});
		},
		login(user) {
			return new Promise((resolve, reject) => {
				auth.login(user)
					.then(() => {
						lofig.get("cookie.SIDname").then(sid => {
							const bc = new BroadcastChannel(
								`${sid}.user_login`
							);
							bc.postMessage(true);
							bc.close();
						});
						resolve({
							status: "success",
							message: "Logged in!"
						});
					})
					.catch(err => reject(new Error(err.message)));
			});
		},
		logout() {
			return new Promise<void>((resolve, reject) => {
				auth.logout()
					.then(() => resolve())
					.catch(() => reject());
			});
		},
		getBasicUser(userId) {
			return new Promise(resolve => {
				if (typeof this.userIdMap[`Z${userId}`] !== "string") {
					if (this.userIdRequested[`Z${userId}`] !== true) {
						this.requestingUserId(userId);
						ws.socket.dispatch(
							"users.getBasicUser",
							userId,
							res => {
								if (res.status === "success") {
									const user = res.data;

									this.mapUserId({
										userId,
										user: {
											name: user.name,
											username: user.username
										}
									});

									this.pendingUserIdCallbacks[
										`Z${userId}`
									].forEach(cb => cb(user));

									this.clearPendingCallbacks(userId);

									return resolve(user);
								}
								return resolve(null);
							}
						);
					} else {
						this.pendingUser({
							userId,
							callback: user => resolve(user)
						});
					}
				} else {
					resolve(this.userIdMap[`Z${userId}`]);
				}
			});
		},
		mapUserId(data) {
			this.userIdMap[`Z${data.userId}`] = data.user;
			this.userIdRequested[`Z${data.userId}`] = false;
		},
		requestingUserId(userId) {
			this.userIdRequested[`Z${userId}`] = true;
			if (!this.pendingUserIdCallbacks[`Z${userId}`])
				this.pendingUserIdCallbacks[`Z${userId}`] = [];
		},
		pendingUser(data) {
			this.pendingUserIdCallbacks[`Z${data.userId}`].push(data.callback);
		},
		clearPendingCallbacks(userId) {
			this.pendingUserIdCallbacks[`Z${userId}`] = [];
		},
		authData(data) {
			this.loggedIn = data.loggedIn;
			this.role = data.role;
			this.username = data.username;
			this.email = data.email;
			this.userId = data.userId;
			this.gotData = true;
		},
		banUser(ban) {
			this.banned = true;
			this.ban = ban;
		},
		updateUsername(username) {
			this.username = username;
		}
	}
});
