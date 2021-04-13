/* eslint-disable import/no-cycle */

import Toast from "toasters";
import ws from "@/ws";

// when Vuex needs to interact with websockets

export default {
	register(user) {
		return new Promise((resolve, reject) => {
			const { username, email, password, recaptchaToken } = user;

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
								document.cookie = `SID=${
									res.SID
								}; expires=${date.toGMTString()}; domain=${
									cookie.domain
								}; ${secure}path=/`;

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
							new Date().getTime() + 2 * 365 * 24 * 60 * 60 * 1000
						);
						const secure = cookie.secure ? "secure=true; " : "";
						let domain = "";
						if (cookie.domain !== "localhost")
							domain = ` domain=${cookie.domain};`;
						document.cookie = `${cookie.SIDname}=${
							res.data.SID
						}; expires=${date.toGMTString()}; ${domain}${secure}path=/`;
						return resolve({ status: "success" });
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
					return lofig.get("cookie").then(cookie => {
						document.cookie = `${cookie.SIDname}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
						return window.location.reload();
					});
				}
				new Toast(res.message);
				return reject(new Error(res.message));
			});
		});
	}
};
