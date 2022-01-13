import config from "config";

import mail from "../index";

/**
 * Sends an email to all admins that a user has submitted a data request
 *
 * @param {string} to - an array of email addresses of admins
 * @param {string} userId - the id of the user the data request is for
 * @param {string} type - the type of data request e.g. remove
 * @param {Function} cb - gets called when an error occurred or when the operation was successful
 */
export default (to, userId, type, cb) => {
	const data = {
		from: config.get("mail.from"),
		to,
		subject: `Data Request - ${type}`,
		html: `
				Hello,
				<br>
				<br>
				User ${userId} has requested to ${type} the data for their account on Musare.
				<br>
				<br>
				This request can be viewed and resolved in the <a href="${config.get(
					"domain"
				)}/admin/users">Users tab of the admin page</a>. Note: All admins will be sent the same message.
			`
	};

	mail.runJob("SEND_MAIL", { data })
		.then(() => cb())
		.catch(err => cb(err));
};
