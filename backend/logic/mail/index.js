/* eslint-disable global-require */
import config from "config";
import Mailgun from "mailgun-js";

import CoreClass from "../../core";

class MailModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("mail");
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
			passwordRequest: await importSchema("passwordRequest")
		};

		this.enabled = config.get("apis.mailgun.enabled");

		if (this.enabled)
			this.mailgun = new Mailgun({
				apiKey: config.get("apis.mailgun.key"),
				domain: config.get("apis.mailgun.domain")
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
		return new Promise(resolve => {
			if (this.enabled)
				this.mailgun.messages().send(payload.data, () => {
					resolve();
				});
			else resolve();
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
			resolve(this.schemas[payload.schemaName]);
		});
	}
}

export default new MailModule();
