/* eslint-disable global-require */
import mailgun from "mailgun-js";

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

		return new Promise(resolve => resolve());
	}

	SEND_MAIL(payload) {
		// data, cb
		return new Promise(resolve => {
			if (this.enabled)
				mailgun.messages().send(payload.data, () => {
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
