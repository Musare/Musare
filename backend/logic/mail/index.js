'use strict';

const config = require('config');
const mailgun = require('mailgun-js')({apiKey: config.get("apis.mailgun.key"), domain: config.get("apis.mailgun.domain")});

let lib = {

	schemas: {},

	init: (cb) => {
		lib.schemas = {
			verifyEmail: require('./schemas/verifyEmail'),
			resetPasswordRequest: require('./schemas/resetPasswordRequest')
		};

		cb();
	},

	sendMail: (data, cb) => {
		if (!cb) cb = ()=>{};
		mailgun.messages().send(data, cb);
	}
};

module.exports = lib;