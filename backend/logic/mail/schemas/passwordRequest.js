import mail from "../index";

/**
 * Sends a request password email
 * @param {string} to - the email address of the recipient
 * @param {string} username - the username of the recipient
 * @param {string} code - the password code of the recipient
 * @param {Function} cb - gets called when an error occurred or when the operation was successful
 */
export default (to, username, code, cb) => {
	const data = {
		to,
		subject: "Password request",
		html: `
				Hello there ${username},
				<br>
				<br>
				Someone has requested to add a password to your account. If this was not you, you can ignore this email.
				<br>
				<br>
				The code is <b>${code}</b>. You can enter this code on the page you requested the password on. This code will expire in 24 hours.
			`
	};

	mail.runJob("SEND_MAIL", { data })
		.then(() => cb())
		.catch(err => cb(err));
};
