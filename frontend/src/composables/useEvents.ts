import { onBeforeUnmount, ref } from "vue";
import { useWebsocketStore } from "@/stores/websocket";

export const useEvents = () => {
	const websocketStore = useWebsocketStore();

	const readySubscriptions = ref({});
	const subscriptions = ref({});

	const onReady = async callback => {
		const uuid = await websocketStore.onReady(callback);

		readySubscriptions.value[uuid] = { callback };

		return uuid;
	};

	const removeReadyCallback = uuid => {
		if (!readySubscriptions.value[uuid]) return;

		websocketStore.removeReadyCallback(uuid);

		delete readySubscriptions.value[uuid];
	};

	const subscribe = async (channel, callback) => {
		const uuid = await websocketStore.subscribe(channel, callback);

		subscriptions.value[uuid] = { channel, callback };

		console.log(11114, uuid, subscriptions.value[uuid]);

		return uuid;
	};

	const unsubscribe = async uuid => {
		if (!subscriptions.value[uuid]) return;

		const { channel } = subscriptions.value[uuid];

		await websocketStore.unsubscribe(channel, uuid);

		delete subscriptions.value[uuid];
	};

	onBeforeUnmount(async () => {
		await Promise.allSettled(
			Object.keys(subscriptions.value).map(uuid => unsubscribe(uuid))
		);

		await Promise.allSettled(
			Object.keys(readySubscriptions.value).map(async uuid =>
				removeReadyCallback(uuid)
			)
		);
	});

	return {
		readySubscriptions,
		subscriptions,
		onReady,
		removeReadyCallback,
		subscribe,
		unsubscribe
	};
};
