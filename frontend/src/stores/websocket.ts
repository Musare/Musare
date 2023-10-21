import { defineStore } from "pinia";
import { ref } from "vue";
import { useConfigStore } from "./config";
import { useUserAuthStore } from "./userAuth";
import utils from "@/utils";
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
			const callbackRef = utils.guid();
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
		if (!socketChannels.includes(channel))
			await runJob("api.subscribe", { channel });

		if (!subscriptions.value[channel]) subscriptions.value[channel] = {};

		const uuid = utils.guid();

		subscriptions.value[channel][uuid] = callback;

		return uuid;
	};

	const subscribeMany = async (
		channels: Record<string, (data?: any) => any>
	) => {
		await runJob("api.subscribeMany", {
			channels: Object.keys(channels).filter(
				channel => !socketChannels.includes(channel)
			)
		});

		return Object.fromEntries(
			Object.entries(channels).map(([channel, callback]) => {
				if (!subscriptions.value[channel])
					subscriptions.value[channel] = {};

				const uuid = utils.guid();

				subscriptions.value[channel][uuid] = callback;

				return [uuid, { channel, callback }];
			})
		);
	};

	const unsubscribe = async (channel: string, uuid: string) => {
		if (
			!subscriptions.value[channel] ||
			!subscriptions.value[channel][uuid]
		)
			return;

		if (
			!socketChannels.includes(channel) &&
			Object.keys(subscriptions.value[channel]).length <= 1
		)
			await runJob("api.unsubscribe", { channel });

		delete subscriptions.value[channel][uuid];

		if (Object.keys(subscriptions.value[channel]).length === 0)
			delete subscriptions.value[channel];
	};

	const unsubscribeMany = async (channels: Record<string, string>) => {
		await runJob("api.unsubscribeMany", {
			channels: Object.values(channels).filter(
				channel =>
					!socketChannels.includes(channel) &&
					Object.keys(subscriptions.value[channel]).length <= 1
			)
		});

		return Promise.all(
			Object.entries(channels).map(async ([uuid, channel]) => {
				if (
					!subscriptions.value[channel] ||
					!subscriptions.value[channel][uuid]
				)
					return;

				delete subscriptions.value[channel][uuid];

				if (Object.keys(subscriptions.value[channel]).length === 0)
					delete subscriptions.value[channel];
			})
		);
	};

	const unsubscribeAll = async () => {
		await runJob("api.unsubscribeAll");

		subscriptions.value = {};
	};

	const onReady = async (callback: () => any) => {
		const uuid = utils.guid();

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

		await Promise.all(
			Object.values(readyCallbacks.value).map(
				async callback => callback() // TODO: Error handling
			)
		);

		await Promise.allSettled(
			Object.keys(subscriptions.value)
				.filter(channel => !socketChannels.includes(channel))
				.map(channel => runJob("api.subscribe", { channel }))
		);

		pendingJobs.value.forEach(message => socket.value.send(message));

		pendingJobs.value = [];
	});

	const init = () => {
		if (
			[WebSocket.CONNECTING, WebSocket.OPEN].includes(
				socket.value?.readyState
			)
		)
			socket.value.close();

		socket.value = new WebSocket(configStore.urls.ws);

		socket.value.addEventListener("message", async message => {
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

			await Promise.all(
				Object.values(subscriptions.value[name]).map(
					async subscription => subscription(...data) // TODO: Error handling
				)
			);
		});

		socket.value.addEventListener("close", () => {
			// TODO: fix this not going away after reconnect

			ready.value = false;

			// try to reconnect every 1000ms, if the user isn't banned
			if (!userAuthStore.banned) setTimeout(init, 1000);
		});
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
