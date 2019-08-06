let lockdown = false;

const Discord = require("discord.js");
const logger = require("./logger");
const config = require("config");

const client = new Discord.Client();

let messagesToSend = [];

let connected = false;

// TODO Maybe we need to only finish init when ready is called, or maybe we don't wait for it
module.exports = {
  adminAlertChannelId: "",

  init: function(discordToken, adminAlertChannelId, errorCb, cb) {
    this.adminAlertChannelId = adminAlertChannelId;

    client.on("ready", () => {
      logger.info("DISCORD_READY", `Logged in as ${client.user.tag}!`);
      connected = true;
      messagesToSend.forEach(message => {
        this.sendAdminAlertMessage(message.message, message.color, message.type, message.critical, message.extraFields);
      });
      messagesToSend = [];
    });

    client.on("invalidated", () => {
      logger.info("DISCORD_INVALIDATED", `Discord client was invalidated.`);
      connected = false;
    });

    client.on("disconnected", () => {
      logger.info("DISCORD_DISCONNECTED", `Discord client was disconnected.`);
      connected = false;
    });

    client.on("error", err => {
      logger.info(
        "DISCORD_ERROR",
        `Discord client encountered an error: ${err.message}.`
      );
    });

    client.login(discordToken);

    if (lockdown) return this._lockdown();
    cb();
  },

  sendAdminAlertMessage: function(message, color, type, critical, extraFields) {
    if (!connected) return messagesToSend.push({message, color, type, critical, extraFields});
    else {
      let channel = client.channels.find("id", this.adminAlertChannelId);
      if (channel !== null) {
        let richEmbed = new Discord.RichEmbed();
        richEmbed.setAuthor(
          "Musare Logger",
          config.get("domain") + "/favicon-194x194.png",
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
            logger.success(
              "SEND_ADMIN_ALERT_MESSAGE",
              `Sent admin alert message: ${message}`
            )
          )
          .catch(() =>
            logger.error(
              "SEND_ADMIN_ALERT_MESSAGE",
              "Couldn't send admin alert message"
            )
          );
      } else {
        logger.error(
          "SEND_ADMIN_ALERT_MESSAGE",
          "Couldn't send admin alert message, channel was not found."
        );
      }
    }
  },

  _lockdown: () => {
    lockdown = true;
  }
};
