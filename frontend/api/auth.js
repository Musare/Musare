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
								lofig.get("cookie", cookie => {
									let date = new Date();
									date.setTime(
										new Date().getTime() +
											2 * 365 * 24 * 60 * 60 * 1000
									);
									let secure = cookie.secure
										? "secure=true; "
										: "";
									document.cookie = `SID=${
										res.SID
									}; expires=${date.toGMTString()}; domain=${
										cookie.domain
									}; ${secure}path=/`;
									return resolve({ status: "success" });
								});
							} else
								return reject({
									status: "error",
									message: "You must login"
								});
						} else
							return reject({
								status: "error",
								message: res.message
							});
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
						lofig.get("cookie", cookie => {
							let date = new Date();
							date.setTime(
								new Date().getTime() +
									2 * 365 * 24 * 60 * 60 * 1000
							);
							let secure = cookie.secure ? "secure=true; " : "";
							let domain = "";
							if (cookie.domain !== "localhost")
								domain = ` domain=${cookie.domain};`;
							document.cookie = `SID=${
								res.SID
							}; expires=${date.toGMTString()}; ${domain}${secure}path=/`;
							return resolve({ status: "success" });
						});
					} else
						return reject({
							status: "error",
							message: res.message
						});
				});
			});
		});
	}
};
