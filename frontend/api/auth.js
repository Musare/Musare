import Toast from "toasters";
import io from "../io";

// when Vuex needs to interact with socket.io

export default {
	register(user) {
		return new Promise((resolve, reject) => {
			const { username, email, password, recaptchaToken } = user;

			io.getSocket(socket => {
				socket.emit(
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

									return resolve({ status: "success" });
								});
							}
							return reject(new Error("You must login"));
						}

						return reject(new Error(res.message));
					}
				);
			});
		});
	},
	login(user) {
		return new Promise((resolve, reject) => {
			const { email, password } = user;

			io.getSocket(socket => {
				socket.emit("users.login", email, password, res => {
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
								res.SID
							}; expires=${date.toGMTString()}; ${domain}${secure}path=/`;
							return resolve({ status: "success" });
						});
					}

					return reject(new Error(res.message));
				});
			});
		});
	},
	logout() {
		return new Promise((resolve, reject) => {
			io.getSocket(socket => {
				socket.emit("users.logout", result => {
					if (result.status === "success") {
						return lofig.get("cookie").then(cookie => {
							document.cookie = `${cookie.SIDname}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
							return window.location.reload();
						});
					}
					new Toast({ content: result.message, timeout: 4000 });
					return reject(new Error(result.message));
				});
			});
		});
	}
};
