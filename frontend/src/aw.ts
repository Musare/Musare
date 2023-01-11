import Toast from "toasters";
import utils from "@/utils";

let gotPong = false;
let pingTries = 0;
let uuid = null;
let enabled = false;

let lastTimeSentMediaDate = 0;
let lastTimeDenied = 0;
let lastTimeCompetitor = 0;

const notConnectedToast = new Toast({
	content: "ActivityWatch is not connected yet.",
	persistent: true,
	interactable: false
});

notConnectedToast.hide();

const sendingMediaDataToast = new Toast({
	content: "Sending media data to ActivityWatch.",
	persistent: true,
	interactable: false
});

sendingMediaDataToast.hide();

const deniedToast = new Toast({
	content:
		"Another Musare instance is already sending data to ActivityWatch Musare extension. Please only use 1 active tab for stations and editsong.",
	persistent: true,
	interactable: false
});

deniedToast.hide();

const competitorToast = new Toast({
	content:
		"Another Musare instance is already sending data to ActivityWatch Musare extension. Please only use 1 active tab for stations and editsong.",
	persistent: true,
	interactable: false
});

competitorToast.hide();

export default {
	sendMediaData(mediaData) {
		if (enabled) {
			if (!gotPong) return false;
			if (lastTimeDenied + 1000 > Date.now()) return false;
			if (lastTimeCompetitor + 1000 > Date.now()) return false;

			lastTimeSentMediaDate = Date.now();
			this.sendEvent("videoData", mediaData);
		}

		return true;
	},

	sendEvent(type, data) {
		if (enabled)
			document.dispatchEvent(
				new CustomEvent("ActivityWatchMusareEvent", {
					detail: {
						type,
						source: uuid,
						data
					}
				})
			);
	},

	enable() {
		if (!enabled) {
			uuid = utils.guid();

			document.addEventListener(
				"ActivityWatchMusareEvent",
				this.eventListener
			);

			notConnectedToast.show();

			this.attemptPing();

			enabled = true;
			console.log("Enabled AW.");

			setInterval(() => {
				if (lastTimeDenied + 1000 > Date.now()) {
					deniedToast.show();
				} else {
					deniedToast.hide();
				}

				if (lastTimeCompetitor + 1000 > Date.now()) {
					competitorToast.show();
				} else {
					competitorToast.hide();
				}

				if (
					!(lastTimeDenied + 1000 > Date.now()) &&
					!(lastTimeCompetitor + 1000 > Date.now()) &&
					lastTimeSentMediaDate + 1000 > Date.now()
				) {
					sendingMediaDataToast.show();
				} else {
					sendingMediaDataToast.hide();
				}
			}, 1000);
		}
	},

	disable() {
		document.removeEventListener(
			"ActivityWatchMusareEvent",
			this.eventListener
		);
		enabled = false;
		notConnectedToast.hide();
		console.log("Disabled AW.");
	},

	eventListener(event) {
		const data = event.detail;

		if (data.type === "pong") {
			gotPong = true;
			notConnectedToast.hide();
			new Toast("Got pong, connected to ActivityWatch Musare extension");
		}

		if (data.type === "denied") {
			lastTimeDenied = Date.now();
		}

		if (data.type === "competitor") {
			if (data.competitor !== uuid) {
				lastTimeCompetitor = Date.now();
			}
		}
	},

	attemptPing() {
		if (!gotPong) {
			if (pingTries < 10) {
				pingTries += 1;
				this.sendEvent("ping", null);
				setTimeout(() => {
					this.attemptPing.apply(this);
				}, 1000);
			} else {
				new Toast(
					"Couldn't connect to ActivityWatch Musare extension."
				);
			}
		}
	}
};
