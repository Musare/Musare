import { defineStore } from "pinia";
import Toast from "toasters";
import validation from "@/validation";
import { useWebsocketsStore } from "@/stores/websockets";

export const useUserAuthStore = defineStore("userAuth", {
	state: (): {
		userIdMap: Record<string, { name: string; username: string }>;
		userIdRequested: Record<string, boolean>;
		pendingUserIdCallbacks: Record<
			string,
			((basicUser: { name: string; username: string }) => void)[]
		>;
		loggedIn: boolean;
		role: "user" | "moderator" | "admin";
		username: string;
		email: string;
		userId: string;
		banned: boolean;
		ban: {
			reason: string;
			expiresAt: number;
		};
		gotData: boolean;
		gotPermissions: boolean;
		permissions: Record<string, boolean>;
	} => ({
		userIdMap: {},
		userIdRequested: {},
		pendingUserIdCallbacks: {},
		loggedIn: false,
		role: "",
		username: "",
		email: "",
		userId: "",
		banned: false,
		ban: {
			reason: null,
			expiresAt: null
		},
		gotData: false,
		gotPermissions: false,
		permissions: {}
	}),
	actions: {
		register(user: {
			username: string;
			email: string;
			password: string;
			recaptchaToken: string;
		}) {
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
				else {
					const { socket } = useWebsocketsStore();
					socket.dispatch(
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
				}
			});
		},
		login(user: { email: string; password: string }) {
			return new Promise((resolve, reject) => {
				const { email, password } = user;

				const { socket } = useWebsocketsStore();
				socket.dispatch("users.login", email, password, res => {
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
				const { socket } = useWebsocketsStore();
				socket.dispatch("users.logout", res => {
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
		getBasicUser(userId: string) {
			return new Promise(
				(
					resolve: (
						basicUser: { name: string; username: string } | null
					) => void
				) => {
					if (typeof this.userIdMap[`Z${userId}`] !== "string") {
						if (this.userIdRequested[`Z${userId}`] !== true) {
							this.requestingUserId(userId);
							const { socket } = useWebsocketsStore();
							socket.dispatch(
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
							this.pendingUser(userId, user => resolve(user));
						}
					} else {
						resolve(this.userIdMap[`Z${userId}`]);
					}
				}
			);
		},
		mapUserId(data: {
			userId: string;
			user: { name: string; username: string };
		}) {
			this.userIdMap[`Z${data.userId}`] = data.user;
			this.userIdRequested[`Z${data.userId}`] = false;
		},
		requestingUserId(userId: string) {
			this.userIdRequested[`Z${userId}`] = true;
			if (!this.pendingUserIdCallbacks[`Z${userId}`])
				this.pendingUserIdCallbacks[`Z${userId}`] = [];
		},
		pendingUser(
			userId: string,
			callback: (basicUser: { name: string; username: string }) => void
		) {
			this.pendingUserIdCallbacks[`Z${userId}`].push(callback);
		},
		clearPendingCallbacks(userId: string) {
			this.pendingUserIdCallbacks[`Z${userId}`] = [];
		},
		authData(data: {
			loggedIn: boolean;
			role: string;
			username: string;
			email: string;
			userId: string;
		}) {
			this.loggedIn = data.loggedIn;
			this.role = data.role;
			this.username = data.username;
			this.email = data.email;
			this.userId = data.userId;
			this.gotData = true;
		},
		banUser(ban: { reason: string; expiresAt: number }) {
			this.banned = true;
			this.ban = ban;
		},
		updateUsername(username: string) {
			this.username = username;
		},
		updateRole(role: string) {
			this.role = role;
		},
		hasPermission(permission: string) {
			return !!(this.permissions && this.permissions[permission]);
		},
		updatePermissions() {
			return new Promise(resolve => {
				const { socket } = useWebsocketsStore();
				socket.dispatch("utils.getPermissions", res => {
					this.permissions = res.data.permissions;
					this.gotPermissions = true;
					resolve(this.permissions);
				});
			});
		}
	}
});
