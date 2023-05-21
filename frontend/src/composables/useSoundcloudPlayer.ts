import { ref, watch } from "vue";
import utils from "@/utils";

const soundcloudDomain = "https://w.soundcloud.com";

export const useSoundcloudPlayer = () => {
	const uuid = utils.guid();

	const soundcloudIframeElement = ref();
	const widgetId = ref();
	const volume = ref();
	const readyCallback = ref();
	const attemptsToPlay = ref(0);
	const debouncePause = ref(null);

	const iframeUrl = ref("");

	const playAttemptTimeout = ref();

	const paused = ref(true);
	const currentTrackId = ref(null);

	const methodCallbacks = {};
	const eventListenerCallbacks = {};
	const stateChangeCallbacks = [];

	const debug = (...args) =>
		process.env.NODE_ENV === "development" &&
		console.debug("[USP]", uuid, widgetId.value, ...args);

	debug("Init start");

	if (!window.soundcloudIframeLockUuids)
		window.soundcloudIframeLockUuids = new Set();

	/*
	EVENTS:
		LOAD_PROGRESS: "loadProgress",
		PLAY_PROGRESS: "playProgress",
		PLAY: "play",
		PAUSE: "pause",
		FINISH: "finish",
		SEEK: "seek",
		READY: "ready",
		OPEN_SHARE_PANEL: "sharePanelOpened",
		CLICK_DOWNLOAD: "downloadClicked",
		CLICK_BUY: "buyClicked",
		ERROR: "error"

	METHODS:
		GET_VOLUME: "getVolume",
		GET_DURATION: "getDuration",
		GET_POSITION: "getPosition",
		GET_SOUNDS: "getSounds",
		GET_CURRENT_SOUND: "getCurrentSound",
		GET_CURRENT_SOUND_INDEX: "getCurrentSoundIndex",
		IS_PAUSED: "isPaused"

		PLAY: "play",
		PAUSE: "pause",
		TOGGLE: "toggle",
		SEEK_TO: "seekTo",
		SET_VOLUME: "setVolume",
		NEXT: "next",
		PREV: "prev",
		SKIP: "skip"

		REMOVE_LISTENER: "removeEventListener",
		ADD_LISTENER: "addEventListener"
	*/

	const trackState = ref("NOT_PLAYING");

	const dispatchMessage = (method, value = null) => {
		const payload = {
			method,
			value
		};

		if (!soundcloudIframeElement.value) return;
		if (
			!soundcloudIframeElement.value.src ||
			!soundcloudIframeElement.value.src.startsWith(soundcloudDomain)
		)
			return;

		if (method !== "getPosition" && method !== "getDuration")
			debug("Dispatch message", method, value);

		soundcloudIframeElement.value.contentWindow.postMessage(
			JSON.stringify(payload),
			`${soundcloudDomain}/player`
		);
	};

	const onLoadListener = () => {};

	const onMessageListener = event => {
		if (event.origin !== soundcloudDomain) return;

		const data = JSON.parse(event.data);
		if (
			data.method !== "getPosition" &&
			data.method !== "getDuration" &&
			(data.method === "ready" || data.widgetId === widgetId.value)
		)
			debug("MESSAGE DATA", data);

		if (data.method === "ready") {
			if (window.soundcloudIframeLockUuid !== uuid) return;

			widgetId.value = data.widgetId;

			if (readyCallback.value) readyCallback.value();

			if (eventListenerCallbacks[data.method])
				eventListenerCallbacks[data.method].forEach(callback => {
					callback(data.value);
				});

			window.soundcloudIframeLockUuid = null;
			document.dispatchEvent(new Event("soundcloudUnlock"));

			return;
		}

		if (data.widgetId !== widgetId.value) return;

		if (methodCallbacks[data.method]) {
			methodCallbacks[data.method].forEach(callback => {
				callback(data.value);
			});
			methodCallbacks[data.method] = [];
		}

		if (eventListenerCallbacks[data.method]) {
			eventListenerCallbacks[data.method].forEach(callback => {
				callback(data.value);
			});
		}
	};

	const addMethodCallback = (type, cb) => {
		if (!methodCallbacks[type]) methodCallbacks[type] = [];
		methodCallbacks[type].push(cb);
	};

	const changeTrackState = newTrackState => {
		clearTimeout(debouncePause.value);

		const oldTrackState = trackState.value;

		trackState.value = newTrackState;

		if (newTrackState !== oldTrackState) {
			stateChangeCallbacks.forEach(cb => {
				cb(newTrackState);
			});
		}
	};

	const soundcloudGetIsPaused = callback => {
		let called = false;

		const _callback = value => {
			if (called) return;
			called = true;

			callback(value);
		};
		addMethodCallback("isPaused", _callback);

		dispatchMessage("isPaused");
	};

	const soundcloudGetCurrentSound = callback => {
		let called = false;

		const _callback = value => {
			if (called) return;
			called = true;

			callback(value);
		};
		addMethodCallback("getCurrentSound", _callback);

		dispatchMessage("getCurrentSound");
	};

	const attemptToPlay = () => {
		if (trackState.value === "playing") return;

		if (trackState.value !== "attempting_to_play") {
			attemptsToPlay.value = 0;
			changeTrackState("attempting_to_play");
		}

		attemptsToPlay.value += 1;

		dispatchMessage("play");
		setTimeout(() => {
			soundcloudGetIsPaused(value => {
				if (trackState.value !== "attempting_to_play") return;

				// Success
				if (!value) {
					changeTrackState("playing");
					return;
				}

				soundcloudGetCurrentSound(sound => {
					// Sound is not available to play
					if (
						value &&
						!paused.value &&
						typeof sound === "object" &&
						(!sound.playable ||
							!sound.public ||
							sound.policy === "BLOCK")
					) {
						changeTrackState("sound_unavailable");
						attemptsToPlay.value = 0;
						return;
					}

					// Too many attempts, failed
					if (attemptsToPlay.value >= 10 && value && !paused.value) {
						changeTrackState("failed_to_play");
						attemptsToPlay.value = 0;
						return;
					}

					if (playAttemptTimeout.value)
						clearTimeout(playAttemptTimeout.value);
					playAttemptTimeout.value = setTimeout(() => {
						if (trackState.value === "attempting_to_play")
							attemptToPlay();
					}, 500);
				});
			});
		}, 500);
	};

	const changeIframeUrl = url => {
		iframeUrl.value = url;
		if (url && window.soundcloudIframeLockUuid !== uuid) {
			// Don't change the iframe src if the player hasn't initialized and isn't allowed to initialize yet
			if (url) window.soundcloudIframeLockUuids.add(uuid);
			if (!window.soundcloudIframeLockUuid)
				document.dispatchEvent(new Event("soundcloudUnlock"));
			return;
		}
		if (!url) widgetId.value = null;
		soundcloudIframeElement.value.setAttribute(
			"src",
			url ?? `${soundcloudDomain}/player`
		);
	};

	const documentUnlockEventListener = () => {
		if (
			!window.soundcloudIframeLockUuid &&
			window.soundcloudIframeLockUuids.size > 0 &&
			window.soundcloudIframeLockUuids.keys().next().value === uuid
		) {
			window.soundcloudIframeLockUuid = uuid;
			window.soundcloudIframeLockUuids.delete(uuid);
			changeIframeUrl(iframeUrl.value);
		}
	};

	watch(soundcloudIframeElement, (newElement, oldElement) => {
		if (oldElement) {
			oldElement.removeEventListener("load", onLoadListener);

			window.removeEventListener("message", onMessageListener);

			if (window.soundcloudIframeLockUuid === uuid)
				window.soundcloudIframeLockUuid = null;
			window.soundcloudIframeLockUuids.delete(uuid);

			document.removeEventListener(
				"soundcloudUnlock",
				documentUnlockEventListener
			);
		}

		if (newElement) {
			newElement.addEventListener("load", onLoadListener);

			window.addEventListener("message", onMessageListener);

			document.removeEventListener(
				"soundcloudUnlock",
				documentUnlockEventListener
			);
			document.addEventListener(
				"soundcloudUnlock",
				documentUnlockEventListener
			);
		}

		if (!window.soundcloudIframeLockUuid)
			document.dispatchEvent(new Event("soundcloudUnlock"));
	});

	/* Exported functions */

	const soundcloudPlay = () => {
		paused.value = false;

		debug("Soundcloud play");

		if (trackState.value !== "attempting_to_play") attemptToPlay();
	};

	const soundcloudPause = () => {
		paused.value = true;

		debug("Soundcloud pause");

		if (playAttemptTimeout.value) clearTimeout(playAttemptTimeout.value);

		dispatchMessage("pause");
	};

	const soundcloudSetVolume = _volume => {
		volume.value = _volume;

		debug("Soundcloud set volume");

		dispatchMessage("setVolume", _volume);
	};

	const soundcloudSeekTo = time => {
		debug("SC SEEK TO", time);

		debug("Soundcloud seek to");

		dispatchMessage("seekTo", time);
	};

	const soundcloudGetPosition = callback => {
		let called = false;

		const _callback = value => {
			if (called) return;
			called = true;

			callback(value);
		};
		addMethodCallback("getPosition", _callback);

		dispatchMessage("getPosition");
	};

	const soundcloudGetDuration = callback => {
		let called = false;

		const _callback = value => {
			if (called) return;
			called = true;

			callback(value);
		};
		addMethodCallback("getDuration", _callback);

		dispatchMessage("getDuration");
	};

	const soundcloudGetState = () => trackState.value;

	const soundcloudGetTrackId = () => currentTrackId.value;

	const soundcloudGetTrackState = () => trackState.value;

	const soundcloudLoadTrack = (trackId, startTime, _paused) => {
		if (!soundcloudIframeElement.value) return;

		debug("Soundcloud load track");

		const url = `${soundcloudDomain}/player?autoplay=false&buying=false&sharing=false&download=false&show_artwork=false&show_playcount=false&show_user=false&url=${`https://api.soundcloud.com/tracks/${trackId}`}`;
		changeIframeUrl(url);

		paused.value = _paused;
		currentTrackId.value = trackId;

		if (playAttemptTimeout.value) clearTimeout(playAttemptTimeout.value);

		changeTrackState("not_started");

		readyCallback.value = () => {
			Object.keys(eventListenerCallbacks).forEach(event => {
				dispatchMessage("addEventListener", event);
			});

			dispatchMessage("setVolume", volume.value ?? 20);
			dispatchMessage("seekTo", (startTime ?? 0) * 1000);
			if (!_paused) attemptToPlay();
		};
	};

	const soundcloudBindListener = (name, callback) => {
		if (!eventListenerCallbacks[name]) {
			eventListenerCallbacks[name] = [];
			dispatchMessage("addEventListener", name);
		}

		eventListenerCallbacks[name].push(callback);
	};

	const soundcloudOnTrackStateChange = callback => {
		debug("On track state change listener added");
		stateChangeCallbacks.push(callback);
	};

	const soundcloudDestroy = () => {
		if (!soundcloudIframeElement.value) return;

		changeIframeUrl(null);

		currentTrackId.value = null;

		changeTrackState("none");
	};

	const soundcloudUnload = () => {
		window.removeEventListener("message", onMessageListener);
	};

	soundcloudBindListener("play", () => {
		debug("On play");

		if (trackState.value !== "attempting_to_play")
			changeTrackState("playing");
	});

	soundcloudBindListener("pause", eventValue => {
		debug("On pause", eventValue);

		const finishedPlaying = eventValue.relativePosition === 1;
		if (finishedPlaying) return;

		clearTimeout(debouncePause.value);
		debouncePause.value = setTimeout(() => {
			if (trackState.value !== "attempting_to_play")
				changeTrackState("paused");
		}, 500);
	});

	soundcloudBindListener("finish", () => {
		debug("On finish");

		changeTrackState("finished");
	});

	soundcloudBindListener("error", () => {
		debug("On error");

		changeTrackState("error");
	});

	debug("Init end");

	return {
		soundcloudIframeElement,
		soundcloudPlay,
		soundcloudPause,
		soundcloudSeekTo,
		soundcloudSetVolume,
		soundcloudLoadTrack,
		soundcloudGetPosition,
		soundcloudGetDuration,
		soundcloudGetIsPaused,
		soundcloudGetState,
		soundcloudGetTrackId,
		soundcloudGetCurrentSound,
		soundcloudGetTrackState,
		soundcloudBindListener,
		soundcloudOnTrackStateChange,
		soundcloudDestroy,
		soundcloudUnload
	};
};
