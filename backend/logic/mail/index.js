/* eslint-disable global-require */
import config from "config";
import nodemailer from "nodemailer";

import CoreClass from "../../core";

let MailModule;

class _MailModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("mail");

		MailModule = this;
	}

	/**
	 * Initialises the mail module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		const importSchema = schemaName =>
			new Promise(resolve => {
				import(`./schemas/${schemaName}`).then(schema => resolve(schema.default));
			});

		this.schemas = {
			verifyEmail: await importSchema("verifyEmail"),
			resetPasswordRequest: await importSchema("resetPasswordRequest"),
			passwordRequest: await importSchema("passwordRequest"),
			dataRequest: await importSchema("dataRequest")
		};

		this.enabled = config.get("smtp.enabled");

		if (this.enabled)
			this.transporter = nodemailer.createTransport({
				host: config.get("smtp.host"),
				port: config.get("smtp.port"),
				secure: config.get("smtp.secure"),
				auth: {
					user: config.get("smtp.auth.user"),
					pass: config.get("smtp.auth.pass")
				}
			});

		return new Promise(resolve => resolve());
	}

	/**
	 * Sends an email
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.data - information such as to, from in order to send the email
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	SEND_MAIL(payload) {
		// console.log(payload);
		return new Promise((resolve, reject) => {
			if (MailModule.enabled)
				return MailModule.transporter
					.sendMail(payload.data)
					.then(info => {
						MailModule.log("SUCCESS", "MAIL_SEND", `Successfully sent email ${info.messageId}`);
						return resolve();
					})
					.catch(err => {
						MailModule.log("ERROR", "MAIL_SEND", `Failed to send email. ${err}`);
						return reject();
					});

			return resolve();
		});
	}

	/**
	 * Returns an email schema
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.schemaName - name of the schema to get
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_SCHEMA(payload) {
		return new Promise(resolve => {
			resolve(MailModule.schemas[payload.schemaName]);
		});
	}
}

export default new _MailModule();
