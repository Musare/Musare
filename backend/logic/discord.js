const coreClass = require("../core");

const EventEmitter = require('events');
const Discord = require("discord.js");
const config = require("config");

const bus = new EventEmitter();

module.exports = class extends coreClass {
	initialize() {
		return new Promise((resolve, reject) => {
			this.setStage(1);

			this.client = new Discord.Client();
			this.adminAlertChannelId = config.get("apis.discord").loggingChannel;
			
			this.client.on("ready", () => {
				this.logger.info("DISCORD_MODULE", `Logged in as ${this.client.user.tag}!`);

				if (this.state === "INITIALIZING") resolve();
				else {
					this.logger.info("DISCORD_MODULE", `Discord client reconnected.`);
					this.setState("INITIALIZED");
				}
			});
		  
			this.client.on("disconnect", () => {
				this.logger.info("DISCORD_MODULE", `Discord client disconnected.`);

				if (this.state === "INITIALIZING") reject();
				else {
					this.failed = true;
					this._lockdown;
				} 
			});

			this.client.on("reconnecting", () => {
				this.logger.info("DISCORD_MODULE", `Discord client reconnecting.`);
				this.setState("RECONNECTING");
			});
		
			this.client.on("error", err => {
				this.logger.info("DISCORD_MODULE", `Discord client encountered an error: ${err.message}.`);
			});

			this.client.login(config.get("apis.discord").token);
		});
	}

	async sendAdminAlertMessage(message, color, type, critical, extraFields) {
		try { await this._validateHook(); } catch { return; }

		const channel = this.client.channels.find("id", this.adminAlertChannelId);
		if (channel !== null) {
			let richEmbed = new Discord.RichEmbed();
			richEmbed.setAuthor(
				"Musare Logger",
				`${config.get("domain")}/favicon-194x194.png`,
				config.get("domain")
			);
			richEmbed.setColor(color);
			richEmbed.setDescription(message);
			//richEmbed.setFooter("Footer", "https://musare.com/favicon-194x194.png");
			//richEmbed.setImage("https://musare.com/favicon-194x194.png");
			//richEmbed.setThumbnail("https://musare.com/favicon-194x194.png");
			richEmbed.setTimestamp(new Date());
			richEmbed.setTitle("MUSARE ALERT");
			richEmbed.setURL(config.get("domain"));
			richEmbed.addField("Type:", type, true);
			richEmbed.addField("Critical:", critical ? "True" : "False", true);
			extraFields.forEach(extraField => {
				richEmbed.addField(
					extraField.name,
					extraField.value,
					extraField.inline
				);
			});

			channel
			.send(message, { embed: richEmbed })
			.then(message =>
				this.logger.success("SEND_ADMIN_ALERT_MESSAGE", `Sent admin alert message: ${message}`)
			)
			.catch(() =>
				this.logger.error("SEND_ADMIN_ALERT_MESSAGE", "Couldn't send admin alert message")
			);
		} else {
			this.logger.error("SEND_ADMIN_ALERT_MESSAGE", "Couldn't send admin alert message, channel was not found.");
		}
	}
}
