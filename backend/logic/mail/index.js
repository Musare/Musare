'use strict';

const coreClass = require("../../core");

const config = require('config');

let mailgun = null;

module.exports = class extends coreClass {
	initialize() {
		return new Promise((resolve, reject) => {
			this.setStage(1);

			this.schemas = {
				verifyEmail: require('./schemas/verifyEmail'),
				resetPasswordRequest: require('./schemas/resetPasswordRequest'),
				passwordRequest: require('./schemas/passwordRequest')
			};

			this.enabled = config.get('apis.mailgun.enabled');

			if (this.enabled)
				mailgun = require('mailgun-js')({
					apiKey: config.get("apis.mailgun.key"),
					domain: config.get("apis.mailgun.domain")
				});
			
			resolve();
		});
	}

	async sendMail(data, cb) {
		try { await this._validateHook(); } catch { return; }

		if (!cb) cb = ()=>{};

		if (this.enabled) mailgun.messages().send(data, cb);
		else cb();
	}
}
