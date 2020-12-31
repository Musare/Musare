import config from "config";
import Discord from "discord.js";

import CoreClass from "../core";

let DiscordModule;

class _DiscordModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("discord");

		DiscordModule = this;
	}

	/**
	 * Initialises the discord module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	initialize() {
		return new Promise((resolve, reject) => {
			this.log("INFO", "Discord initialize");

			this.client = new Discord.Client();
			this.adminAlertChannelId = config.get("apis.discord").loggingChannel;

			this.client.on("ready", () => {
				this.log("INFO", `Logged in as ${this.client.user.tag}!`);

				if (this.getStatus() === "INITIALIZING") {
					resolve();
				} else if (this.getStatus() === "RECONNECTING") {
					this.log("INFO", `Discord client reconnected.`);
					this.setStatus("READY");
				}
			});

			this.client.on("disconnect", () => {
				this.log("INFO", `Discord client disconnected.`);

				if (this.getStatus() === "INITIALIZING") reject();
				else {
					this.setStatus("DISCONNECTED");
				}
			});

			this.client.on("reconnecting", () => {
				this.log("INFO", `Discord client reconnecting.`);
				this.setStatus("RECONNECTING");
			});

			this.client.on("error", err => {
				this.log("INFO", `Discord client encountered an error: ${err.message}.`);
			});

			this.client.login(config.get("apis.discord").token);
		});
	}

	/**
	 * Adds a new activity to the database
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.color - The colour of the alert title
	 * @param {string} payload.message - The message to send as the alert
	 * @param {string} payload.type - The type of alert e.g. Startup
	 * @param {boolean} payload.critical - If the message is service critical
	 * @param {Array} payload.extraFields - Any extra fields to show in the discord message
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	SEND_ADMIN_ALERT_MESSAGE(payload) {
		return new Promise((resolve, reject) => {
			const channel = DiscordModule.client.channels.find(
				channel => channel.id === DiscordModule.adminAlertChannelId
			);

			if (channel !== null) {
				const richEmbed = new Discord.RichEmbed();
				richEmbed.setAuthor(
					"Musare Logger",
					`${config.get("domain")}/favicon-194x194.png`,
					config.get("domain")
				);
				richEmbed.setColor(payload.color);
				richEmbed.setDescription(payload.message);
				// richEmbed.setFooter("Footer", "https://musare.com/favicon-194x194.png");
				// richEmbed.setImage("https://musare.com/favicon-194x194.png");
				// richEmbed.setThumbnail("https://musare.com/favicon-194x194.png");
				richEmbed.setTimestamp(new Date());
				richEmbed.setTitle("MUSARE ALERT");
				richEmbed.setURL(config.get("domain"));
				richEmbed.addField("Type:", payload.type, true);
				richEmbed.addField("Critical:", payload.critical ? "True" : "False", true);
				payload.extraFields.forEach(extraField => {
					richEmbed.addField(extraField.name, extraField.value, extraField.inline);
				});

				channel
					.send(payload.message, { embed: richEmbed })
					.then(message =>
						resolve({
							status: "success",
							message: `Successfully sent admin alert message: ${message}`
						})
					)
					.catch(() => reject(new Error("Couldn't send admin alert message")));
			} else {
				reject(new Error("Channel was not found"));
			}
			// if (true) {
			//     resolve({});
			// } else {
			//     reject(new Error("Nothing changed."));
			// }
		});
	}
}

export default new _DiscordModule();
