const CoreClass = require("../../core.js");

const config = require("config");

let mailgun = null;

class MailModule extends CoreClass {
    constructor() {
        super("mail");
    }

    initialize() {
        return new Promise((resolve, reject) => {
            this.schemas = {
                verifyEmail: require("./schemas/verifyEmail"),
                resetPasswordRequest: require("./schemas/resetPasswordRequest"),
                passwordRequest: require("./schemas/passwordRequest"),
            };

            this.enabled = config.get("apis.mailgun.enabled");

            if (this.enabled)
                mailgun = require("mailgun-js")({
                    apiKey: config.get("apis.mailgun.key"),
                    domain: config.get("apis.mailgun.domain"),
                });

            resolve();
        });
    }

    SEND_MAIL(payload) {
        //data, cb
        return new Promise((resolve, reject) => {
            if (this.enabled)
                mailgun.messages().send(payload.data, () => {
                    resolve();
                });
            else resolve();
        });
    }

    GET_SCHEMA(payload) {
        return new Promise((resolve, reject) => {
            resolve(this.schemas[payload.schemaName]);
        });
    }
}

module.exports = new MailModule();
