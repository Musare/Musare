import { onBeforeUnmount, reactive, readonly } from "vue";
import { forEachIn } from "@common/utils/forEachIn";
import { useModelStore } from "@/stores/model";
import Model from "@/Model";

export const useModels = () => {
	const modelStore = useModelStore();

	const models = reactive({});
	const subscriptions = reactive({
		created: {},
		updated: {},
		deleted: {}
	});
	const deletedSubscriptions = reactive({});

	/**
	 * Subscribes to events for when models of a certain type are created
	 */
	const onCreated = async (
		modelName: string,
		callback: (data?: any) => any
	) => {
		const subscriptionUuid = await modelStore.onCreated(
			modelName,
			callback
		);

		subscriptions.created[modelName] ??= [];
		subscriptions.created[modelName].push(subscriptionUuid);

		return subscriptionUuid;
	};

	/**
	 * Subscribes to events for when models of a certain type are updated
	 */
	const onUpdated = async (
		modelName: string,
		callback: (data?: any) => any
	) => {
		const subscriptionUuid = await modelStore.onUpdated(
			modelName,
			callback
		);

		subscriptions.updated[modelName] ??= [];
		subscriptions.updated[modelName].push(subscriptionUuid);

		return subscriptionUuid;
	};

	/**
	 * Subscribes to events for when models of a certain type are deleted
	 */
	const onDeleted = async (
		modelName: string,
		callback: (data?: any) => any
	) => {
		const subscriptionUuid = await modelStore.onDeleted(
			modelName,
			callback
		);

		subscriptions.deleted[modelName] ??= [];
		subscriptions.deleted[modelName].push(subscriptionUuid);

		return subscriptionUuid;
	};

	/**
	 * Unsubscribes a specific create/update/delete subscription
	 */
	const removeCallback = async (
		modelName: string,
		type: "created" | "updated" | "deleted",
		subscriptionUuid: string
	) => {
		if (
			!subscriptions[type][modelName] ||
			!subscriptions[type][modelName].find(
				subscription => subscription === subscriptionUuid
			)
		)
			return;

		await modelStore.removeCallback(modelName, type, subscriptionUuid);

		delete subscriptions[type][modelName][subscriptionUuid];
	};

	/**
	 * Sets up subscriptions to when models are deleted, to automatically remove models
	 */
	const setupDeletedSubscriptions = async (modelNames: string[]) => {
		const modelNamesWithoutSubscriptions = modelNames.filter(
			modelName => !deletedSubscriptions[modelName]
		);
		await forEachIn(modelNamesWithoutSubscriptions, async modelName => {
			deletedSubscriptions[modelName] = await onDeleted(
				modelName,
				({ oldDoc }) => {
					const { _id: modelId } = oldDoc;

					if (!models[modelName] || !models[modelName][modelId])
						return;

					delete models[modelName][modelId];
				}
			);
		});
	};

	/**
	 * Registers a list of models, together with any potential relations
	 */
	const registerModels = async (
		storeModels: any[],
		relations?: Record<string, string | string[]>
	) => {
		const registeredModels = await modelStore.registerModels(
			storeModels,
			relations
		);

		registeredModels.forEach((model: Model) => {
			models[model.getName()] ??= {};
			models[model.getName()][model.getId()] ??= model;
		});

		const modelNames = registeredModels.reduce(
			(modelNames: string[], model) => {
				if (!modelNames.includes(model.getName()))
					modelNames.push(model.getName());
				return modelNames;
			},
			[]
		);

		await setupDeletedSubscriptions(modelNames);

		return registeredModels;
	};

	/**
	 * Registers a single model, together with any potential relations
	 */
	const registerModel = async (
		storeModel: any,
		relations?: Record<string, string | string[]>
	) => {
		const registeredModel = await modelStore.registerModel(
			storeModel,
			relations
		);

		models[registeredModel.getName()] ??= {};
		models[registeredModel.getName()][registeredModel.getId()] ??=
			registeredModel;

		await setupDeletedSubscriptions([registeredModel.getName()]);

		return registeredModel;
	};

	/**
	 * Tries to load one or more models for a specific model type, along with any potential relations
	 * Just like in registerModels, the models that are loaded are also registered
	 */
	const loadModels = async (
		modelName: string,
		modelIdOrModelIds: string | string[],
		relations?: Record<string, string | string[]>
	) => {
		const modelIds = Array.isArray(modelIdOrModelIds)
			? modelIdOrModelIds
			: [modelIdOrModelIds];

		models[modelName] ??= {};

		const missingModelIds = modelIds.filter(
			modelId => !models[modelName][modelId]
		);
		const existingModelIds = modelIds.filter(
			modelId => !!models[modelName][modelId]
		);
		const existingModels = existingModelIds.map(
			modelId => models[modelName][modelId]
		);

		if (relations)
			await forEachIn(existingModels, async model =>
				model.loadRelations(relations)
			);

		if (existingModels.length === modelIds.length)
			return Object.fromEntries(
				existingModels.map(model => [model._id, model])
			);

		const loadedModels = await modelStore.loadModels(
			modelName,
			missingModelIds,
			relations
		);

		const missingModels: Model[] = Object.values(loadedModels).filter(
			missingModel => !!missingModel
		);
		missingModels.forEach(model => {
			models[modelName][model.getId()] ??= model;
		});

		const modelNames = missingModels.reduce(
			(modelNames: string[], model) => {
				if (!modelNames.includes(model.getName()))
					modelNames.push(model.getName());
				return modelNames;
			},
			[]
		);
		await setupDeletedSubscriptions(modelNames);

		return Object.fromEntries(
			existingModels
				.concat(Object.values(missingModels))
				.map(model => [model._id, model])
		);
	};

	/**
	 * Unregisters one or more model
	 */
	const unregisterModels = async (modelName, modelIds: string[]) => {
		const modelIdsToUnregister = modelIds.filter(
			modelId => !!(models[modelName] && models[modelName][modelId])
		);
		await modelStore.unregisterModels(modelName, modelIdsToUnregister);

		modelIdsToUnregister.forEach(modelId => {
			if (!models[modelName] || !models[modelName][modelId]) return;
			delete models[modelName][modelId];
		});
	};

	/**
	 * The below is called before the Vue component/page that created this instance of this composable is unmounted
	 * It cleans up any models and subscriptions
	 */
	onBeforeUnmount(async () => {
		// Before unmount, unsubscribe from all subscriptions for this composable
		const subscriptionTypes = Object.keys(subscriptions);
		await forEachIn(
			subscriptionTypes,
			async (subscriptionType: "created" | "updated" | "deleted") => {
				const modelNames = Object.keys(subscriptions[subscriptionType]);

				await forEachIn(modelNames, async modelName => {
					const subscriptionUuids =
						subscriptions[subscriptionType][modelName];

					await forEachIn(
						subscriptionUuids,
						async subscriptionUuid => {
							await removeCallback(
								modelName,
								subscriptionType,
								subscriptionUuid
							);
						}
					);
				});
			}
		);

		// Before unmount, unregister all models from this composable
		const modelNames = Object.keys(models);
		await forEachIn(modelNames, async modelName => {
			const modelIds = Object.keys(models[modelName]);
			await unregisterModels(modelName, modelIds);
		});
	});

	return {
		models: readonly(models),
		subscriptions: readonly(subscriptions),
		deletedSubscriptions: readonly(deletedSubscriptions),
		onCreated,
		onUpdated,
		onDeleted,
		removeCallback,
		registerModel,
		registerModels,
		unregisterModels,
		loadModels
	};
};
