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
	const deletedSubscriptions = ref({});

	const onCreated = async (
		modelName: string,
		callback: (data?: any) => any
	) => {
		const uuid = await modelStore.onCreated(modelName, callback);

		subscriptions.value.created[modelName] ??= [];
		subscriptions.value.created[modelName].push(uuid);

		return uuid;
	};

	const onUpdated = async (
		modelName: string,
		callback: (data?: any) => any
	) => {
		const uuid = await modelStore.onUpdated(modelName, callback);

		subscriptions.value.updated[modelName] ??= [];
		subscriptions.value.updated[modelName].push(uuid);

		return uuid;
	};

	const onDeleted = async (
		modelName: string,
		callback: (data?: any) => any
	) => {
		const uuid = await modelStore.onDeleted(modelName, callback);

		subscriptions.value.deleted[modelName] ??= [];
		subscriptions.value.deleted[modelName].push(uuid);

		return uuid;
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

	const setupDeletedSubscriptions = (registeredModels: any[]) =>
		Promise.all(
			registeredModels
				.filter(
					(model, index) =>
						!deletedSubscriptions.value[model._name] &&
						registeredModels.findIndex(
							storeModel => storeModel._name === model._name
						) === index
				)
				.map(async registeredModel => {
					deletedSubscriptions.value[registeredModel._name] =
						await onDeleted(registeredModel._name, ({ oldDoc }) => {
							const modelIndex = models.value.findIndex(
								model => model._id === oldDoc._id
							);

							if (modelIndex < 0) return;

							delete models.value[modelIndex];
						});
				})
		);

	const registerModels = async (
		storeModels: any[],
		relations?: Record<string, string | string[]>
	) => {
		const registeredModels = await modelStore.registerModels(
			storeModels,
			relations
		);

		models.value.push(...registeredModels);

		await setupDeletedSubscriptions(registeredModels);

		return registeredModels;
	};

	const loadModels = async (
		modelName: string,
		modelIds: string | string[],
		relations?: Record<string, string | string[]>
	) => {
		const registeredModels = await modelStore.loadModels(
			modelName,
			modelIds,
			relations
		);

		models.value.push(...registeredModels);

		await setupDeletedSubscriptions(registeredModels);

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
		deletedSubscriptions,
		onCreated,
		onUpdated,
		onDeleted,
		removeCallback,
		registerModels,
		unregisterModels,
		loadModels
	};
};
