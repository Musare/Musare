import Toast from "toasters";

let gotPong = false;
let pingTries = 0;
let uuid = null;
let enabled = false;

let lastTimeSentVideoDate = 0;
let lastTimeDenied = 0;
let lastTimeCompetitor = 0;

const notConnectedToast = new Toast({
	content: "ActivityWatch is not connected yet.",
	persistent: true,
	interactable: false
});
notConnectedToast.hide();

const sendingVideoDataToast = new Toast({
	content: "Sending video data to ActivityWatch.",
	persistent: true,
	interactable: false
});
sendingVideoDataToast.hide();

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
	sendVideoData(videoData) {
		if (enabled) {
			lastTimeSentVideoDate = Date.now();
			this.sendEvent("videoData", videoData);
		}
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
			uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
				/[xy]/g,
				function abc(c) {
					// eslint-disable-next-line
					const r = (Math.random() * 16) | 0;
					// eslint-disable-next-line
					const v = c == "x" ? r : (r & 0x3) | 0x8;
					return v.toString(16);
				}
			);

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
					lastTimeSentVideoDate + 1000 > Date.now()
				) {
					sendingVideoDataToast.show();
				} else {
					sendingVideoDataToast.hide();
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
			new Toast({
				content:
					"Got pong, connected to ActivityWatch Musare extension",
				timeout: 8000
			});
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
				new Toast({
					content:
						"Couldn't connect to ActivityWatch Musare extension.",
					timeout: 8000
				});
			}
		}
	}
};
