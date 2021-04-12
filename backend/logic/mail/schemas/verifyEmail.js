import config from "config";

// const moduleManager = require('../../../index');

import mail from "../index";

/**
 * Sends a verify email email
 *
 * @param {string} to - the email address of the recipient
 * @param {string} username - the username of the recipient
 * @param {string} code - the email reset code of the recipient
 * @param {Function} cb - gets called when an error occurred or when the operation was successful
 */
export default (to, username, code, cb) => {
	const data = {
		from: "Musare <noreply@musare.com>",
		to,
		subject: "Please verify your email",
		html: `
				Hello there ${username},
				<br>
				<br>
				To verify your email, please visit <a href="${config.get("serverDomain")}/auth/verify_email?code=${code}">${config.get(
			"serverDomain"
		)}/auth/verify_email?code=${code}</a>.
			`
	};

	mail.runJob("SEND_MAIL", { data })
		.then(() => cb())
		.catch(err => cb(err));
};
