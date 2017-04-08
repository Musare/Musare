'use strict';

const config = require('config');
const enabled = config.get('apis.mailgun.enabled');
let mailgun = null;
if (enabled) {
	mailgun = require('mailgun-js')({
		apiKey: config.get("apis.mailgun.key"),
		domain: config.get("apis.mailgun.domain")
	});
}

let initialized = false;
let lockdown = false;

let lib = {

	schemas: {},

	init: (cb) => {
		lib.schemas = {
			verifyEmail: require('./schemas/verifyEmail'),
			resetPasswordRequest: require('./schemas/resetPasswordRequest'),
			passwordRequest: require('./schemas/passwordRequest')
		};

		initialized = true;

		if (lockdown) return this._lockdown();
		cb();
	},

	sendMail: (data, cb) => {
		if (lockdown) return cb('Lockdown');
		if (!cb) cb = ()=>{};
		if (enabled) mailgun.messages().send(data, cb);
		else cb();
	},

	_lockdown: () => {
		lockdown = true;
	}
};

module.exports = lib;