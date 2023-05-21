/* eslint-disable-next-line no-redeclare */
/* global MediaMetadata */

export default {
	initialized: false,
	mediaSessionData: {},
	listeners: {},
	audio: null,
	ytReady: false,
	playSuccessful: false,
	loopInterval: null,
	setYTReady(ytReady) {
		if (ytReady)
			setTimeout(() => {
				this.ytReady = true;
			}, 1000);
		else this.ytReady = false;
	},
	setListeners(priority, listeners) {
		this.listeners[priority] = listeners;
	},
	removeListeners(priority) {
		delete this.listeners[priority];
	},
	setMediaSessionData(priority, playing, title, artist, album, artwork) {
		this.mediaSessionData[priority] = {
			playing, // True = playing, false = paused
			mediaMetadata: new MediaMetadata({
				title,
				artist,
				album,
				...(artwork ? { artwork: [{ src: artwork }] } : null)
			})
		};
	},
	removeMediaSessionData(priority) {
		delete this.mediaSessionData[priority];
	},
	// Gets the highest priority media session data and updates the media session
	updateMediaSession() {
		const highestPriority = this.getHighestPriority();

		if (typeof highestPriority === "number") {
			const mediaSessionDataObject =
				this.mediaSessionData[highestPriority];
			navigator.mediaSession.metadata =
				mediaSessionDataObject.mediaMetadata;

			if (
				mediaSessionDataObject.playing ||
				!this.ytReady ||
				!this.playSuccessful
			) {
				navigator.mediaSession.playbackState = "playing";
				this.audio
					.play()
					.then(() => {
						if (this.audio.currentTime > 1.0) {
							this.audio.muted = true;
						}
						this.playSuccessful = true;
					})
					.catch(() => {
						this.playSuccessful = false;
					});
			} else {
				this.audio.pause();
				navigator.mediaSession.playbackState = "paused";
			}
		} else {
			this.audio.pause();
			navigator.mediaSession.playbackState = "none";
			navigator.mediaSession.metadata = null;
		}
	},
	getHighestPriority() {
		return Object.keys(this.mediaSessionData)
			.map(priority => Number(priority))
			.sort((a, b) => a - b)
			.reverse()[0];
	},
	initialize() {
		if (this.initialized) return;

		this.audio = new Audio("/assets/15-seconds-of-silence.mp3");

		this.audio.loop = true;
		this.audio.volume = 0.1;

		navigator.mediaSession.setActionHandler("play", () => {
			this.listeners[this.getHighestPriority()].play();
		});

		navigator.mediaSession.setActionHandler("pause", () => {
			this.listeners[this.getHighestPriority()].pause();
		});

		navigator.mediaSession.setActionHandler("nexttrack", () => {
			this.listeners[this.getHighestPriority()].nexttrack();
		});

		this.loopInterval = setInterval(() => {
			this.updateMediaSession();
		}, 100);

		this.initialized = true;
	},
	uninitialize() {
		if (!this.initialized) return;

		navigator.mediaSession.setActionHandler("play", null);
		navigator.mediaSession.setActionHandler("pause", null);
		navigator.mediaSession.setActionHandler("nexttrack", null);

		clearInterval(this.loopInterval);

		this.initialized = false;
	}
};
