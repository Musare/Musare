import mail from "../index";

/**
 * Sends a request password reset email
 *
 * @param {string} to - the email address of the recipient
 * @param {string} username - the username of the recipient
 * @param {string} code - the password reset code of the recipient
 * @param {Function} cb - gets called when an error occurred or when the operation was successful
 */
export default (to, username, code, cb) => {
	const data = {
		from: "Musare <noreply@musare.com>",
		to,
		subject: "Password reset request",
		html: `
				Hello there ${username},
				<br>
				<br>
				Someone has requested to reset the password of your account. If this was not you, you can ignore this email.
				<br>
				<br>
				The reset code is <b>${code}</b>. You can enter this code on the page you requested the password reset. This code will expire in 24 hours.
			`
	};

	mail.runJob("SEND_MAIL", { data })
		.then(() => cb())
		.catch(err => cb(err));
};
