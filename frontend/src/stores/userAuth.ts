import { defineStore } from "pinia";
import Toast from "toasters";
import validation from "@/validation";
import ws from "@/ws";

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
		gotData: false,
		permissions: {}
	}),
	actions: {
		register(user) {
			return new Promise((resolve, reject) => {
				const { username, email, password, recaptchaToken } = user;

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
					ws.socket.dispatch(
						"users.register",
						username,
						email,
						password,
						recaptchaToken,
						res => {
							if (res.status === "success") {
								if (res.SID) {
									return lofig.get("cookie").then(cookie => {
										const date = new Date();
										date.setTime(
											new Date().getTime() +
												2 * 365 * 24 * 60 * 60 * 1000
										);

										const secure = cookie.secure
											? "secure=true; "
											: "";

										let domain = "";
										if (cookie.domain !== "localhost")
											domain = ` domain=${cookie.domain};`;

										document.cookie = `${cookie.SIDname}=${
											res.SID
										}; expires=${date.toUTCString()}; ${domain}${secure}path=/`;

										return resolve({
											status: "success",
											message: "Account registered!"
										});
									});
								}

								return reject(new Error("You must login"));
							}

							return reject(new Error(res.message));
						}
					);
			});
		},
		login(user) {
			return new Promise((resolve, reject) => {
				const { email, password } = user;

				ws.socket.dispatch("users.login", email, password, res => {
					if (res.status === "success") {
						return lofig.get("cookie").then(cookie => {
							const date = new Date();
							date.setTime(
								new Date().getTime() +
									2 * 365 * 24 * 60 * 60 * 1000
							);

							const secure = cookie.secure ? "secure=true; " : "";

							let domain = "";
							if (cookie.domain !== "localhost")
								domain = ` domain=${cookie.domain};`;

							document.cookie = `${cookie.SIDname}=${
								res.data.SID
							}; expires=${date.toUTCString()}; ${domain}${secure}path=/`;

							const bc = new BroadcastChannel(
								`${cookie.SIDname}.user_login`
							);
							bc.postMessage(true);
							bc.close();

							return resolve({
								status: "success",
								message: "Logged in!"
							});
						});
					}

					return reject(new Error(res.message));
				});
			});
		},
		logout() {
			return new Promise((resolve, reject) => {
				ws.socket.dispatch("users.logout", res => {
					if (res.status === "success") {
						return resolve(
							lofig.get("cookie").then(cookie => {
								document.cookie = `${cookie.SIDname}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
								return window.location.reload();
							})
						);
					}
					new Toast(res.message);
					return reject(new Error(res.message));
				});
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
			this.permissions = data.permissions || {};
			this.gotData = true;
		},
		banUser(ban) {
			this.banned = true;
			this.ban = ban;
		},
		updateUsername(username) {
			this.username = username;
		},
		hasPermission(permission) {
			return !!(this.permissions && this.permissions[permission]);
		}
	}
});
