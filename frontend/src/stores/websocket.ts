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
	const readyCallbacks = ref(new Set());
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

		if (!subscriptions.value[channel])
			subscriptions.value[channel] = new Set();

		subscriptions.value[channel].add(callback);
	};

	const unsubscribe = async (
		channel: string,
		callback: (data?: any) => any
	) => {
		if (!socketChannels.includes(channel))
			await runJob("api.unsubscribe", { channel });

		if (!subscriptions.value[channel]) return;

		subscriptions.value[channel].delete(callback);
	};

	const unsubscribeAll = async () => {
		await runJob("api.unsubscribeAll");

		subscriptions.value = {};
	};

	const onReady = async (callback: () => any) => {
		readyCallbacks.value.add(callback);
		if (ready.value) await callback();
	};

	const removeReadyCallback = (callback: () => any) => {
		readyCallbacks.value.delete(callback);
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

		for await (const callback of readyCallbacks.value.values()) {
			await callback().catch(() => {}); // TODO: Error handling
		}

		await Promise.allSettled(
			Object.keys(subscriptions.value)
				.filter(channel => !socketChannels.includes(channel))
				.map(channel => runJob("api.subscribe", { channel }))
		);

		pendingJobs.value.forEach(message => socket.value.send(message));
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

			for await (const subscription of subscriptions.value[
				name
			].values()) {
				await subscription(...data);
			}
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
		unsubscribe,
		unsubscribeAll,
		onReady,
		removeReadyCallback
	};
});
