import { reactive, ref, readonly } from "vue";
import { defineStore } from "pinia";
import { generateUuid } from "@common/utils/generateUuid";
import { forEachIn } from "@common/utils/forEachIn";
import { useWebsocketStore } from "./websocket";
import Model from "@/Model";

class DeferredPromise<T = any> {
	promise: Promise<T>;

	reject;

	resolve;

	// eslint-disable-next-line require-jsdoc
	constructor() {
		this.promise = new Promise<T>((resolve, reject) => {
			this.reject = reject;
			this.resolve = resolve;
		});
	}
}

interface ModelFetcherRequest {
	promise: DeferredPromise;
	payload: {
		modelName: string;
		modelIds: string[];
	};
}

// TODO combine the ModelFetcher and the ModelPermissionFetcher
/**
 * Class used for fetching models in bulk, every 25ms max, per model type
 * So if we tried to fetch 100 different minifiedUser models separately, it would do only 1 request to fetch the models, not 100 separate ones
 */
class ModelFetcher {
	private static requestsQueued: ModelFetcherRequest[] = [];

	private static timeoutActive = false;

	private static responseCache = {};

	private static fetch() {
		// If there is no other timeout running, indicate we will run one. Otherwise, return, as a timeout is already running
		if (!this.timeoutActive) this.timeoutActive = true;
		else return;

		setTimeout(() => {
			// Reset timeout active, so another one can run
			this.timeoutActive = false;
			// Make a copy of all requests currently queued, and then take those requests out of the queue so we can request them
			const requests = this.requestsQueued;
			this.requestsQueued = [];

			// Splits the requests per model
			const requestsPerModel = {};
			requests.forEach(request => {
				const { modelName } = request.payload;
				if (!Array.isArray(requestsPerModel[modelName]))
					requestsPerModel[modelName] = [];
				requestsPerModel[modelName].push(request);
			});

			const modelNames = Object.keys(requestsPerModel);

			const { runJob } = useWebsocketStore();

			// TODO somehow make the following forEachIn run at the same time for all modelNames
			// Runs the requests per model
			forEachIn(modelNames, async modelName => {
				// All already cached model ids
				let cachedModelIds = Object.keys(this.responseCache[modelName]);

				// Gets a unique list of all model ids for the current model that we want to request permissions for, that are not already cached
				const modelIds = Array.from(
					new Set(
						requestsPerModel[modelName].flatMap(
							request => request.payload.modelIds
						)
					)
				).filter((modelId: string) => !cachedModelIds.includes(modelId));

				// Only do a request if more than one model isn't already cached
				if (modelIds.length > 0) {
					console.log(`Requesting model ids`, modelName, modelIds);
					const result = await runJob(`data.${modelName}.findManyById`, {
						_ids: modelIds
					}) as any[];
					
					// Cache the responses for the requested model ids
					modelIds.forEach(modelId => {
						const model = result.find(model => model._id === modelId);
						console.log(`Caching ${modelName}.${modelId}`, model);
						this.responseCache[modelName][modelId] = model;
					});
				}

				const requests = requestsPerModel[modelName];
				// For all requests, resolve the deferred promise with the returned model(s) that was requested
				requests.forEach(request => {
					const { payload, promise } = request;
					const { modelIds } = payload;
					const models = modelIds.map(modelId => this.responseCache[modelName][modelId]).filter(model => model);
					promise.resolve(models);
				});

				// A unique list of model ids that are will be requested in the next batch for the current model type
				const queuedModelIds = Array.from(new Set(this.requestsQueued.filter(request => request.payload.modelName).flatMap(request => request.payload.modelIds)));
				// A list of model ids responses currently cached
				cachedModelIds = Object.keys(this.responseCache[modelName]);
				// A list of the cached model responses that can safely be deleted, because no queued up request needs it
				const cachedModelIdsToDelete = cachedModelIds.filter(cachedModelId => !queuedModelIds.includes(cachedModelId));
				console.log(`Queued model ids`, modelName, queuedModelIds);
				console.log(`Cached model ids`, modelName, cachedModelIds);
				console.log(`Cached model ids to delete`, modelName, cachedModelIdsToDelete);

				// TODO In theory, we could check if any of the queued requests can be resolved here. Not worth it at the moment.

				cachedModelIdsToDelete.forEach(cachedModelIdToDelete => {
					delete this.responseCache[modelName][cachedModelIdToDelete];
				});
			});
		}, 25);
	}

	public static fetchModelsByIds(modelName: string, modelIds: string[]) {
		this.responseCache[modelName] ??= {};

		return new Promise(resolve => {
			const promise = new DeferredPromise();

			// Listens for the deferred promise response, before we actually push and fetch
			promise.promise.then(result => {
				resolve(result);
			});

			// Pushes the request to the queue
			this.requestsQueued.push({
				payload: {
					modelName,
					modelIds
				},
				promise
			});

			// Calls the fetch function, which will start a timeout if one isn't already running, which will actually request the model
			this.fetch();
		});
	}
}

/**
 * Pinia store for managing models
 */
export const useModelStore = defineStore("model", () => {
	const { runJob, subscribe, subscribeMany, unsubscribe, unsubscribeMany } =
		useWebsocketStore();

	const models = reactive({});
	const permissions = reactive({});
	const createdSubcription = ref(null);
	const subscriptions = reactive({
		created: {},
		updated: {},
		deleted: {}
	});

	/**
	 * Returns generic model permissions for the current user for a specific model type
	 */
	const getUserModelPermissions = async (modelName: string) => {
		if (permissions[modelName]) return permissions[modelName];

		const data = await runJob("data.users.getModelPermissions", {
			modelName
		});

		permissions[modelName] = data;

		return permissions[modelName];
	};

	/**
	 * Checks if we have a specific generic permission for a specific model type
	 */
	const hasPermission = async (modelName: string, permission: string) => {
		const data = await getUserModelPermissions(modelName);

		return !!data[permission];
	};

	/**
	 * This functions gets called when the backend notifies us that a model was created
	 * We then notify every subscription in the frontend about it
	 */
	const onCreatedCallback = async (modelName: string, data) => {
		if (!subscriptions.created[modelName]) return;

		await forEachIn(
			Object.values(subscriptions.created[modelName]),
			async subscription => subscription(data) // TODO: Error handling
		);
	};

	/**
	 * This functions gets called when the backend notifies us that a model was updated
	 * We then notify every subscription in the frontend about it
	 */
	const onUpdatedCallback = async (modelName: string, { doc }) => {
		const model = models[modelName] && models[modelName][doc._id];
		if (model) model.updateData(doc);

		if (!subscriptions.updated[modelName]) return;

		await forEachIn(
			Object.values(subscriptions.updated[modelName]),
			async subscription => subscription(data) // TODO: Error handling
		);
	};

	/**
	 * This functions gets called when the backend notifies us that a model was deleted
	 * We then notify every subscription in the frontend about it
	 */
	const onDeletedCallback = async (modelName: string, data) => {
		const { oldDoc } = data;

		if (subscriptions.deleted[modelName])
			await forEachIn(
				Object.values(subscriptions.deleted[modelName]),
				async subscription => subscription(data) // TODO: Error handling
			);

		const model = models[modelName] && models[modelName][oldDoc._id];
		// TODO how does this work with addUse?
		if (model) await unregisterModels(modelName, oldDoc._id); // eslint-disable-line no-use-before-define
	};

	/**
	 * Subscribes the provided callback to model creation events
	 * The provided callback will be called when the backend notifies us that a model of the provided type is created
	 */
	const onCreated = async (
		modelName: string,
		callback: (data?: any) => any
	) => {
		if (!createdSubcription.value)
			createdSubcription.value = await subscribe(
				`model.${modelName}.created`,
				data => onCreatedCallback(modelName, data)
			);

		const uuid = generateUuid();

		subscriptions.created[modelName] ??= {};
		subscriptions.created[modelName][uuid] = callback;

		return uuid;
	};

	/**
	 * Subscribes the provided callback to model update events
	 * The provided callback will be called when the backend notifies us that a model of the provided type is updated
	 */
	const onUpdated = async (
		modelName: string,
		callback: (data?: any) => any
	) => {
		const uuid = generateUuid();

		subscriptions.updated[modelName] ??= {};
		subscriptions.updated[modelName][uuid] = callback;

		return uuid;
	};

	/**
	 * Subscribes the provided callback to model deletion events
	 * The provided callback will be called when the backend notifies us that a model of the provided type is deleted
	 */
	const onDeleted = async (
		modelName: string,
		callback: (data?: any) => any
	) => {
		const uuid = generateUuid();

		subscriptions.deleted[modelName] ??= {};
		subscriptions.deleted[modelName][uuid] = callback;

		return uuid;
	};

	/**
	 * Allows removing a specific subscription, so the callback of that subscription is no longer called when the backend notifies us
	 * For type created, we also unsubscribe to events from the backend
	 * For type updated/deleted, we are subscribed to specific model id updated/deleted events, those are not unsubscribed when
	 * there's no subscriptions in the frontend actually using them
	 */
	const removeCallback = async (
		modelName: string,
		type: "created" | "updated" | "deleted",
		uuid: string
	) => {
		if (
			!subscriptions[type][modelName] ||
			!subscriptions[type][modelName][uuid]
		)
			return;

		delete subscriptions[type][modelName][uuid];

		if (
			type === "created" &&
			Object.keys(subscriptions.created[modelName]).length === 0
		) {
			await unsubscribe(
				`model.${modelName}.created`,
				createdSubcription.value
			);

			createdSubcription.value = null;
		}
	};

	/**
	 * Returns the model for the provided name and id
	 * First tries to get the model from the already loaded models
	 * If it's not already loaded, it fetches it from the backend
	 *
	 * Does not register the model that was fetched
	 *
	 * // TODO return value?
	 */
	const findById = async (modelName: string, modelId: string) => {
		const existingModel = models[modelName] && models[modelName][modelId];

		if (existingModel) return existingModel;

		const [model] = await ModelFetcher.fetchModelsByIds(modelName, [modelId]) as unknown[];

		return model;
	};

	/**
	 * Returns a list of models based on the provided model name and ids
	 * First tries to get all models from the already loaded models
	 * If after that we miss any models, we fetch those from the backend, and return everything we found
	 *
	 * Does not register the models that were fetched
	 */
	const findManyById = async (modelName: string, modelIds: string[]) => {
		const existingModels = modelIds
			.map(modelId => models[modelName] && models[modelName][modelId])
			.filter(model => !!model);
		const existingModelIds = existingModels.map(model => model._id);
		const missingModelIds = modelIds.filter(
			_id => !existingModelIds.includes(_id)
		);

		let fetchedModels = [];
		if (missingModelIds.length > 0)
			fetchedModels = await ModelFetcher.fetchModelsByIds(modelName, missingModelIds) as unknown[];

		const allModels = existingModels.concat(fetchedModels);

		// Warning: returns models and direct results

		return Object.fromEntries(
			modelIds.map(modelId => [
				modelId,
				allModels.find(model => model._id === modelId)
			])
		);
	};

	/**
	 * Removes models locally if no one else is still using it
	 * Also unsubscribes to any updated/deleted subscriptions
	 */
	const unregisterModels = async (
		modelName: string,
		modelIdOrModelIds: string | string[]
	) => {
		const modelIds = Array.isArray(modelIdOrModelIds)
			? modelIdOrModelIds
			: [modelIdOrModelIds];
		const removeModels = [];
		await forEachIn(modelIds, async modelId => {
			if (!models[modelName] || !models[modelName][modelId]) return;

			const model = models[modelName][modelId];

			model.removeUse();

			if (model.getUses() > 1) return;

			// TODO only do this after a grace period
			removeModels.push(model);
		});

		if (removeModels.length === 0) return;

		await forEachIn(removeModels, async model =>
			model.unregisterRelations()
		);

		const subscriptions = Object.fromEntries(
			removeModels.flatMap(model => {
				const { updated, deleted } = model.getSubscriptions() ?? {};

				return [
					[
						updated,
						`model.${model.getName()}.updated.${model.getId()}`
					],
					[
						deleted,
						`model.${model.getName()}.deleted.${model.getId()}`
					]
				];
			})
		);

		await unsubscribeMany(subscriptions);

		await forEachIn(removeModels, async removeModel => {
			const { _id: modelIdToRemove } = removeModel;
			if (!models[modelName] || !models[modelName][modelIdToRemove])
				return;
			delete models[modelName][modelIdToRemove];
		});
	};

	/**
	 * Registers models/documents
	 * If any models/documents already exist, increments the use counter, and tries to load any potentially missing relations
	 * For documents that don't already exist, registers them locally, adds subscriptions for updated/deleted events,
	 * increments the use counter, and loads any potential relations
	 */
	const registerModels = async (
		documentsOrModels: any[],
		relations?: Record<string, string | string[]>
	): Promise<Model[]> => {
		console.info("Register models", documentsOrModels, relations);

		const existingModels = documentsOrModels
			.map(({ _name, _id }) =>
				models[_name] ? models[_name][_id] ?? null : null
			)
			.filter(model => !!model);

		await forEachIn(existingModels, async model => {
			model.addUse();

			if (relations && relations[model._name])
				await model.loadRelations(relations[model._name]);
		});

		if (documentsOrModels.length === existingModels.length)
			return existingModels;

		const missingDocuments = documentsOrModels.filter(
			({ _name, _id }) => !models[_name] || !models[_name][_id]
		);

		const channels = Object.fromEntries(
			missingDocuments.flatMap(({ _name, _id }) => [
				[
					`model.${_name}.updated.${_id}`,
					data => onUpdatedCallback(_name, data)
				],
				[
					`model.${_name}.deleted.${_id}`,
					data => onDeletedCallback(_name, data)
				]
			])
		);
		const subscriptions = Object.entries(await subscribeMany(channels));

		const newModels = await forEachIn(missingDocuments, async document => {
			const { _name, _id } = document;

			const modelSubscriptions = subscriptions.filter(
				([, { channel }]) =>
					channel.startsWith(`model.${_name}`) &&
					channel.endsWith(`.${_id}`)
			);
			const [updated] = modelSubscriptions.find(([, { channel }]) =>
				channel.includes(".updated.")
			);
			const [deleted] = modelSubscriptions.find(([, { channel }]) =>
				channel.includes(".deleted.")
			);

			if (!updated || !deleted) return null;

			const model = reactive(new Model(document));
			model.setSubscriptions(updated, deleted);
			model.addUse();

			// TODO what if relations are relevant for some registers, but not others? Unregister if no register relies on a relation
			if (relations && relations[_name])
				await model.loadRelations(relations[_name]);

			if (!models[_name]) {
				models[_name] = {};
			}
			models[_name][_id] = model;

			return model;
		});

		return existingModels.concat(newModels);
	};

	/**
	 * Registers a model or document
	 * Helper function to be able to register a single model/document, simply calls registerModels
	 */
	const registerModel = async (
		documentOrModel: any,
		relations?: Record<string, string | string[]>
	): Promise<Model> => {
		const [model] = await registerModels([documentOrModel], relations);

		return model;
	};

	/**
	 * Loads one or more models for a provided model name and a provided model id or model ids, optionally including any relations
	 * First fetches models from the already loaded models
	 * Tries to fetch any missing models from the backend
	 */
	const loadModels = async (
		modelName: string,
		modelIdsOrModelId: string | string[],
		relations?: Record<string, string | string[]>
	): Promise<Map<string, Model | null>> => {
		const modelIds = Array.isArray(modelIdsOrModelId)
			? modelIdsOrModelId
			: [modelIdsOrModelId];
		const existingModels = modelIds
			.map(_id => models[modelName] && models[modelName][_id])
			.filter(model => !!model);
		const existingModelIds = existingModels.map(model => model._id);
		const missingModelIds = modelIds.filter(
			_id => !existingModelIds.includes(_id)
		);

		console.info(
			"Load models",
			structuredClone(modelIds),
			structuredClone(existingModels),
			structuredClone(missingModelIds)
		);

		const fetchedModels = await findManyById(modelName, missingModelIds);
		const registeredModels = await registerModels(
			Object.values(fetchedModels)
				.filter(model => !!model)
				.concat(existingModels),
			relations
		);
		const modelsNotFound = modelIds
			.filter(
				modelId =>
					!registeredModels.find(model => model.getId() === modelId)
			)
			.map(modelId => [modelId, null]);

		return Object.fromEntries(
			registeredModels
				.map(model => [model.getId(), model])
				.concat(modelsNotFound)
		);
	};

	return {
		models: readonly(models),
		permissions: readonly(permissions),
		subscriptions: readonly(subscriptions),
		onCreated,
		onUpdated,
		onDeleted,
		removeCallback,
		registerModel,
		registerModels,
		unregisterModels,
		loadModels,
		findById,
		findManyById,
		hasPermission
	};
});
