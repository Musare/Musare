import { onBeforeUnmount, ref } from "vue";
import { useModelStore } from "@/stores/model";

export const useModels = () => {
	const modelStore = useModelStore();

	const models = ref([]);
	const subscriptions = ref({
		created: {},
		updated: {},
		deleted: {}
	});

	const onCreated = async (
		modelName: string,
		callback: (data?: any) => any
	) => {
		const uuid = await modelStore.onCreated(modelName, callback);

		subscriptions.value.created[modelName] ??= [];
		subscriptions.value.created[modelName].push(uuid);
	};

	const onUpdated = async (
		modelName: string,
		callback: (data?: any) => any
	) => {
		const uuid = await modelStore.onUpdated(modelName, callback);

		subscriptions.value.updated[modelName] ??= [];
		subscriptions.value.updated[modelName].push(uuid);
	};

	const onDeleted = async (
		modelName: string,
		callback: (data?: any) => any
	) => {
		const uuid = await modelStore.onDeleted(modelName, callback);

		subscriptions.value.deleted[modelName] ??= [];
		subscriptions.value.deleted[modelName].push(uuid);
	};

	const removeCallback = async (
		modelName: string,
		type: "created" | "updated" | "deleted",
		uuid: string
	) => {
		if (
			!subscriptions.value[type][modelName] ||
			!subscriptions.value[type][modelName].find(
				subscription => subscription === uuid
			)
		)
			return;

		await modelStore.removeCallback(modelName, type, uuid);

		delete subscriptions.value[type][modelName][uuid];
	};

	const registerModels = async (modelName: string, storeModels: any[]) => {
		const registeredModels = await modelStore.registerModels(
			modelName,
			storeModels
		);

		models.value.push(...registeredModels);

		await onDeleted(modelName, ({ oldDoc }) => {
			if (!models.value[modelName]) return;

			const modelIndex = models.value[modelName].findIndex(
				model => model._id === oldDoc._id
			);

			if (modelIndex < 0) return;

			delete models.value[modelName][modelIndex];
		});

		return registeredModels;
	};

	const unregisterModels = async (modelIds: string[]) => {
		await modelStore.unregisterModels(
			modelIds.filter(modelId =>
				models.value.find(model => modelId === model._id)
			)
		);

		models.value = models.value.filter(
			model => !modelIds.includes(model._id)
		);
	};

	onBeforeUnmount(async () => {
		await Promise.all(
			Object.entries(subscriptions.value).map(async ([type, uuids]) =>
				Object.entries(uuids).map(async ([modelName, _subscriptions]) =>
					Promise.all(
						_subscriptions.map(uuid =>
							removeCallback(modelName, type, uuid)
						)
					)
				)
			)
		);
		await unregisterModels(models.value.map(model => model._id));
	});

	return {
		models,
		subscriptions,
		onCreated,
		onUpdated,
		onDeleted,
		removeCallback,
		registerModels,
		unregisterModels
	};
};
