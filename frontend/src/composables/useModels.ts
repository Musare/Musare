import { onBeforeUnmount, ref } from "vue";
import { forEachIn } from "@common/utils/forEachIn";
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
		forEachIn(
			registeredModels.filter(
				(model, index) =>
					!deletedSubscriptions.value[model._name] &&
					registeredModels.findIndex(
						storeModel => storeModel._name === model._name
					) === index
			),
			async registeredModel => {
				deletedSubscriptions.value[registeredModel._name] =
					await onDeleted(registeredModel._name, ({ oldDoc }) => {
						const modelIndex = models.value.findIndex(
							model => model._id === oldDoc._id
						);

						if (modelIndex < 0) return;

						delete models.value[modelIndex];
					});
			}
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
		modelIds = Array.isArray(modelIds) ? modelIds : [modelIds];

		const missingModelIds = modelIds.filter(
			modelId =>
				!models.value.find(
					model => model._id === modelId && model._name === modelName
				)
		);
		const existingModels = Object.fromEntries(
			models.value
				.filter(model => modelIds.includes(model._id))
				.map(model => [model._id, model])
		);

		if (relations)
			await forEachIn(Object.values(existingModels), async model =>
				model.loadRelations(relations)
			);

		if (Object.keys(existingModels).length === modelIds.length)
			return existingModels;

		const loadedModels = await modelStore.loadModels(
			modelName,
			missingModelIds,
			relations
		);

		const missingModels = Object.values(loadedModels).filter(
			missingModel => !!missingModel
		);
		models.value.push(...missingModels);
		await setupDeletedSubscriptions(missingModels);

		return Object.assign(loadedModels, existingModels);
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
		await forEachIn(
			Object.entries(subscriptions.value),
			async ([type, uuids]) =>
				Object.entries(uuids).map(async ([modelName, _subscriptions]) =>
					forEachIn(_subscriptions, uuid =>
						removeCallback(modelName, type, uuid)
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
