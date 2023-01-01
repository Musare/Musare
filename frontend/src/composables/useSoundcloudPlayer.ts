import { ref, watch } from "vue";

const TAG = "[USP]";

const soundcloudDomain = "https://w.soundcloud.com";

export const useSoundcloudPlayer = () => {
	console.debug(TAG, "Init start");

	const soundcloudIframeElement = ref();
	const widgetId = ref();
	const volume = ref();
	const readyCallback = ref();
	const attemptsToPlay = ref(0);

	const paused = ref(true);
	const currentTrackId = ref(null);

	const methodCallbacks = {};
	const eventListenerCallbacks = {};

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

		// if (method !== "getPosition")
		// 	console.debug(TAG, "Dispatch message", method, value);

		soundcloudIframeElement.value.contentWindow.postMessage(
			JSON.stringify(payload),
			`${soundcloudDomain}/player`
		);
	};

	const onLoadListener = () => {};

	const onMessageListener = event => {
		if (event.origin !== soundcloudDomain) return;

		// if (event.data.indexOf("getPosition") === -1)
		// 	console.debug(TAG, "On message", event.data);

		const data = JSON.parse(event.data);
		if (data.method !== "getPosition" && data.method !== "getDuration")
			console.log("MESSAGE DATA", data);

		if (data.method === "ready") {
			widgetId.value = data.widgetId;

			if (!readyCallback.value) return;

			readyCallback.value();

			return;
		}

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

	const attemptToPlay = () => {
		attemptsToPlay.value += 1;

		dispatchMessage("play");
		dispatchMessage("isPaused", value => {
			if (!value || paused.value || attemptsToPlay.value >= 10) return;

			setTimeout(() => {
				attemptToPlay();
			}, 500);
		});
	};

	watch(soundcloudIframeElement, (newElement, oldElement) => {
		if (oldElement) {
			oldElement.removeEventListener("load", onLoadListener);

			window.removeEventListener("message", onMessageListener);
		}

		if (newElement) {
			newElement.addEventListener("load", onLoadListener);

			window.addEventListener("message", onMessageListener);
		}
	});

	/* Exported functions */

	const soundcloudPlay = () => {
		paused.value = false;

		console.log("SC PLAY");

		console.debug(TAG, "Soundcloud play");

		dispatchMessage("play");
	};

	const soundcloudPause = () => {
		paused.value = true;

		console.log("SC PAUSE");

		console.debug(TAG, "Soundcloud pause");

		dispatchMessage("pause");
	};

	const soundcloudSetVolume = _volume => {
		volume.value = _volume;

		console.debug(TAG, "Soundcloud set volume");

		dispatchMessage("setVolume", _volume);
	};

	const soundcloudSeekTo = time => {
		console.log("SC SEEK TO", time);

		console.debug(TAG, "Soundcloud seek to");

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

	const soundcloudGetTrackId = () => currentTrackId.value;

	const soundcloudLoadTrack = (trackId, startTime, _paused) => {
		if (!soundcloudIframeElement.value) return;

		console.debug(TAG, "Soundcloud load track");

		const url = `${soundcloudDomain}/player?autoplay=false&buying=false&sharing=false&download=false&show_artwork=false&show_playcount=false&show_user=false&url=${`https://api.soundcloud.com/tracks/${trackId}`}`;

		soundcloudIframeElement.value.setAttribute("src", url);

		paused.value = _paused;
		currentTrackId.value = trackId;

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

	const soundcloudDestroy = () => {
		if (!soundcloudIframeElement.value) return;

		const url = `${soundcloudDomain}/player?autoplay=false&buying=false&sharing=false&download=false&show_artwork=false&show_playcount=false&show_user=false&url=${`https://api.soundcloud.com/tracks/${0}`}`;
		soundcloudIframeElement.value.setAttribute("src", url);

		currentTrackId.value = null;
	};

	const soundcloudUnload = () => {
		window.removeEventListener("message", onMessageListener);
	};

	console.debug(TAG, "Init end");

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
		soundcloudGetTrackId,
		soundcloudBindListener,
		soundcloudDestroy,
		soundcloudUnload
	};
};
