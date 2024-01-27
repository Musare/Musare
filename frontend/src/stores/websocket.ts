import { defineStore } from "pinia";
import { ref } from "vue";
import { generateUuid } from "@common/utils/generateUuid";
import { forEachIn } from "@common/utils/forEachIn";
import { useConfigStore } from "./config";
import { useUserAuthStore } from "./userAuth";
import ms from "@/ms";

export const useWebsocketStore = defineStore("websocket", () => {
	const configStore = useConfigStore();
	const userAuthStore = useUserAuthStore();

	const socket = ref();
	const ready = ref(false);
	const readyCallbacks = ref({});
	const jobCallbacks = ref({});
	const pendingJobs = ref([]);
	const subscriptions = ref({});

	const socketChannels = ["ready", "error"];

	const runJob = async (job: string, payload?: any) =>
		new Promise((resolve, reject) => {
			const callbackRef = generateUuid();
			const message = JSON.stringify([
				job,
				payload ?? {},
				{ callbackRef }
			]);

			jobCallbacks.value[callbackRef] = { resolve, reject };

			if (ready.value && socket.value?.readyState === WebSocket.OPEN)
				socket.value.send(message);
			else pendingJobs.value.push(message);
		});

	const subscribe = async (
		channel: string,
		callback: (data?: any) => any
	) => {
		if (!subscriptions.value[channel])
			subscriptions.value[channel] = {
				status: "subscribing",
				callbacks: {}
			};

		if (
			!socketChannels.includes(channel) &&
			subscriptions.value[channel].status !== "subscribed"
		) {
			subscriptions.value[channel].status = "subscribing";
			await runJob("events.subscribe", { channel });
		}

		subscriptions.value[channel].status = "subscribed";

		const uuid = generateUuid();

		subscriptions.value[channel].callbacks[uuid] = callback;

		return uuid;
	};

	const subscribeMany = async (
		channels: Record<string, (data?: any) => any>
	) => {
		const channelsToSubscribeTo = Object.keys(channels).filter(
			channel =>
				!socketChannels.includes(channel) &&
				subscriptions.value[channel]?.status !== "subscribed"
		);

		channelsToSubscribeTo.forEach(channel => {
			if (!subscriptions.value[channel])
				subscriptions.value[channel] = {
					status: "subscribing",
					callbacks: {}
				};

			subscriptions.value[channel].status = "subscribing";
		});

		await runJob("events.subscribeMany", {
			channels: channelsToSubscribeTo
		});

		channelsToSubscribeTo.forEach(channel => {
			subscriptions.value[channel].status = "subscribed";
		});

		return Object.fromEntries(
			Object.entries(channels).map(([channel, callback]) => {
				const uuid = generateUuid();

				subscriptions.value[channel].callbacks[uuid] = callback;

				return [uuid, { channel, callback }];
			})
		);
	};

	const unsubscribe = async (channel: string, uuid: string) => {
		if (
			socketChannels.includes(channel) ||
			!subscriptions.value[channel] ||
			!subscriptions.value[channel].callbacks[uuid]
		)
			return;

		if (
			subscriptions.value[channel].status === "subscribed" &&
			Object.keys(subscriptions.value[channel].callbacks).length <= 1
		)
			await runJob("events.unsubscribe", { channel });

		delete subscriptions.value[channel].callbacks[uuid];

		if (Object.keys(subscriptions.value[channel].callbacks).length === 0)
			delete subscriptions.value[channel];
	};

	const unsubscribeMany = async (channels: Record<string, string>) => {
		const channelsToUnsubscribeFrom = Object.values(channels).filter(
			channel =>
				!socketChannels.includes(channel) &&
				subscriptions.value[channel] &&
				subscriptions.value[channel].status === "subscribed" &&
				Object.keys(subscriptions.value[channel].callbacks).length <= 1
		);

		await runJob("events.unsubscribeMany", {
			channels: channelsToUnsubscribeFrom
		});

		channelsToUnsubscribeFrom.forEach(channel => {
			delete subscriptions.value[channel];
		});

		return forEachIn(Object.entries(channels), async ([uuid, channel]) => {
			if (
				!subscriptions.value[channel] ||
				!subscriptions.value[channel].callbacks[uuid]
			)
				return;

			delete subscriptions.value[channel].callbacks[uuid];

			if (
				Object.keys(subscriptions.value[channel].callbacks).length === 0
			)
				delete subscriptions.value[channel];
		});
	};

	const unsubscribeAll = async () => {
		await runJob("events.unsubscribeAll");

		subscriptions.value = {};
	};

	const onReady = async (callback: () => any) => {
		const uuid = generateUuid();

		readyCallbacks.value[uuid] = callback;

		if (ready.value) await callback();

		return uuid;
	};

	const removeReadyCallback = (uuid: string) => {
		if (!readyCallbacks.value[uuid]) return;

		delete readyCallbacks.value[uuid];
	};

	subscribe("ready", async data => {
		configStore.$patch(data.config);

		userAuthStore.currentUser = data.user;
		userAuthStore.gotData = true;

		if (userAuthStore.loggedIn) {
			userAuthStore.resetCookieExpiration();
		}

		if (configStore.experimental.media_session) ms.initialize();
		else ms.uninitialize();

		ready.value = true;

		await userAuthStore.updatePermissions();

		await forEachIn(
			Object.values(readyCallbacks.value),
			async callback => callback() // TODO: Error handling
		);

		await forEachIn(
			Object.keys(subscriptions.value).filter(
				channel => !socketChannels.includes(channel)
			),
			channel => runJob("events.subscribe", { channel }),
			{ onError: Promise.resolve }
		);

		pendingJobs.value.forEach(message => socket.value.send(message));

		pendingJobs.value = [];
	});

	const onMessage = async message => {
		const data = JSON.parse(message.data);
		const name = data.shift(0);

		if (name === "jobCallback") {
			const callbackRef = data.shift(0);
			const response = data.shift(0);

			if (response?.status === "success")
				jobCallbacks.value[callbackRef]?.resolve(response?.data);
			else jobCallbacks.value[callbackRef]?.reject(response);

			delete jobCallbacks.value[callbackRef];

			return;
		}

		if (!subscriptions.value[name]) return;

		await forEachIn(
			Object.values(subscriptions.value[name].callbacks),
			async subscription => subscription(...data) // TODO: Error handling
		);
	};

	const onClose = () => {
		ready.value = false;

		// try to reconnect every 1000ms, if the user isn't banned
		// eslint-disable-next-line no-use-before-define
		if (!userAuthStore.banned) setTimeout(init, 1000);
	};

	const init = () => {
		if (
			[WebSocket.CONNECTING, WebSocket.OPEN].includes(
				socket.value?.readyState
			)
		) {
			socket.value.close();

			socket.value.removeEventListener("message", onMessage);
			socket.value.removeEventListener("close", onClose);
		}

		socket.value = new WebSocket(`${configStore.urls.ws}?rewrite=1`);

		socket.value.addEventListener("message", onMessage);
		socket.value.addEventListener("close", onClose);
	};

	init();

	return {
		socket,
		ready,
		readyCallbacks,
		jobCallbacks,
		pendingJobs,
		subscriptions,
		runJob,
		subscribe,
		subscribeMany,
		unsubscribe,
		unsubscribeMany,
		unsubscribeAll,
		onReady,
		removeReadyCallback
	};
});
