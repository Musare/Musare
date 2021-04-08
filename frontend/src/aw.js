import Toast from "toasters";

let gotPong = false;
let pingTries = 0;
let uuid = null;

// let sendingVideoDataToast = new Toast({
// 	content: "Sending video data to ActivityWatch.",
// 	persistant: true
// });

// let deniedToast = new Toast({
// 	content:
// 		"Another Musare instance is already sending data to ActivityWatch Musare extension. Please only use 1 active tab for stations and editsong.",
// 	persistant: true
// });

// let competitorToast = new Toast({
// 	content:
// 		"Another Musare instance is already sending data to ActivityWatch Musare extension. Please only use 1 active tab for stations and editsong.",
// 	persistant: true
// });

export default {
	sendVideoData(videoData) {
		this.sendEvent("videoData", videoData);
	},

	sendEvent(type, data) {
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

	init() {
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

		document.addEventListener("ActivityWatchMusareEvent", event => {
			const data = event.detail;

			if (data.type === "pong") {
				gotPong = true;
				new Toast({
					content:
						"Got pong, connected to ActivityWatch Musare extension",
					timeout: 8000
				});
			}

			if (data.type === "denied") {
				new Toast({
					content:
						"Another Musare instance is already sending data to ActivityWatch Musare extension. Please only use 1 active tab for stations and editsong.",
					timeout: 4000
				});
			}

			if (data.type === "competitor") {
				if (data.competitor !== uuid)
					new Toast({
						content:
							"Another Musare instance is trying and failing to send data to the ActivityWatch Musare instance. Please only use 1 active tab for stations and editsong.",
						timeout: 4000
					});
			}
		});

		this.attemptPing();

		// setInterval(() => {
		// }, 1000);
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
