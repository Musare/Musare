/* eslint-disable global-require */
import config from "config";
import Mailgun from "mailgun-js";

import CoreClass from "../../core";

class MailModule extends CoreClass {
	constructor() {
		super("mail");
	}

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

	SEND_MAIL(payload) {
		// data
		return new Promise(resolve => {
			if (this.enabled)
				this.mailgun.messages().send(payload.data, () => {
					resolve();
				});
			else resolve();
		});
	}

	GET_SCHEMA(payload) {
		return new Promise(resolve => {
			resolve(this.schemas[payload.schemaName]);
		});
	}
}

export default new MailModule();
