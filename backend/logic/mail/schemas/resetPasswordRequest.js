const config = require('config');
const mail = require('../index');

/**
 * Sends a request password reset email
 *
 * @param {String} to - the email address of the recipient
 * @param {String} username - the username of the recipient
 * @param {String} code - the password reset code of the recipient
 * @param {Function} cb - gets called when an error occurred or when the operation was successful
 */
module.exports = function(to, username, code, cb) {
	let data = {
		from: 'Musare <noreply@musare.com>',
		to: to,
		subject: 'Password reset request',
		html:
			`
				Hello there ${username},
				<br>
				<br>
				Someone has requested to reset the password of your account. If this was not you, you can ignore this email.
				<br>
				<br>
				The reset code is <b>${code}</b>. You can enter this code on the page you requested the password reset. This code will expire in 24 hours.
			`
	};

	mail.sendMail(data, cb);
};