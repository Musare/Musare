import { onBeforeUnmount, ref } from "vue";
import { forEachIn } from "@common/utils/forEachIn";
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

		return uuid;
	};

	const subscribeMany = async channels => {
		const _subscriptions = await websocketStore.subscribeMany(channels);

		await forEachIn(
			Object.entries(_subscriptions),
			async ([uuid, { channel, callback }]) => {
				subscriptions.value[uuid] = { channel, callback };
			}
		);

		return Object.fromEntries(
			Object.entries(_subscriptions).map(([uuid, { channel }]) => [
				channel,
				uuid
			])
		);
	};

	const unsubscribe = async uuid => {
		if (!subscriptions.value[uuid]) return;

		const { channel } = subscriptions.value[uuid];

		await websocketStore.unsubscribe(channel, uuid);

		delete subscriptions.value[uuid];
	};

	const unsubscribeMany = async uuids => {
		if (uuids.length === 0) return;

		const _subscriptions = Object.fromEntries(
			Object.entries(subscriptions.value)
				.filter(([uuid]) => uuids.includes(uuid))
				.map(([uuid, { channel }]) => [uuid, channel])
		);

		await websocketStore.unsubscribeMany(_subscriptions);

		await forEachIn(uuids, async uuid => {
			delete subscriptions.value[uuid];
		});
	};

	onBeforeUnmount(async () => {
		await forEachIn(
			Object.keys(subscriptions.value),
			uuid => unsubscribe(uuid),
			{ onError: Promise.resolve }
		);

		await forEachIn(
			Object.keys(readySubscriptions.value),
			async uuid => removeReadyCallback(uuid),
			{ onError: Promise.resolve }
		);
	});

	return {
		readySubscriptions,
		subscriptions,
		onReady,
		removeReadyCallback,
		subscribe,
		subscribeMany,
		unsubscribe,
		unsubscribeMany
	};
};
