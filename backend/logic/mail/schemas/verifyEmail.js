const config = require('config');
const mail = require('../index');

/**
 * Sends a verify email email
 *
 * @param {String} to - the email address of the recipient
 * @param {String} username - the username of the recipient
 * @param {String} code - the email reset code of the recipient
 * @param {Function} cb - gets called when an error occurred or when the operation was successful
 */
module.exports = function(to, username, code, cb) {
	let data = {
		from: 'Musare <noreply@musare.com>',
		to: to,
		subject: 'Please verify your email',
		html:
			`
				Hello there ${username},
				<br>
				<br>
				To verify your email, please visit <a href="${config.get('serverDomain')}/auth/verify_email?code=${code}">${config.get('serverDomain')}/auth/verify_email?code=${code}</a>.
			`
	};

	mail.sendMail(data, cb);
};