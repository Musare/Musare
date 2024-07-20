import { DeferredPromise } from "@common/DeferredPromise";
import { forEachIn } from "@common/utils/forEachIn";
import { useWebsocketStore } from "@/stores/websocket";

export interface ModelFetcherRequest {
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
export class ModelFetcher {
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
				).filter(
					(modelId: string) => !cachedModelIds.includes(modelId)
				);

				// Only do a request if more than one model isn't already cached
				if (modelIds.length > 0) {
					console.log(`Requesting model ids`, modelName, modelIds);
					let errorCaught = false;
					const result = (await runJob(
						`data.${modelName}.findManyById`,
						{
							_ids: modelIds
						}
					).catch(err => {
						errorCaught = true;
						const requests = requestsPerModel[modelName];
						// For all requests, reject the deferred promise with the returned error.
						// TODO in the future, we want to handle mixed cases where one or more model was rejected, and one or more was returned
						requests.forEach(request => {
							const { promise } = request;
							promise.reject(err);
						});
					})) as any[];

					if (errorCaught) return;

					// Cache the responses for the requested model ids
					modelIds.forEach(modelId => {
						const model = result.find(
							model => model._id === modelId
						);
						console.log(`Caching ${modelName}.${modelId}`, model);
						this.responseCache[modelName][modelId] = model;
					});
				}

				const requests = requestsPerModel[modelName];
				// For all requests, resolve the deferred promise with the returned model(s) that was requested
				requests.forEach(request => {
					const { payload, promise } = request;
					const { modelIds } = payload;
					const models = modelIds
						.map(modelId => this.responseCache[modelName][modelId])
						.filter(model => model);
					// TODO add errors here for models that returned an error, or if the entire job returned an error
					promise.resolve(models);
				});

				// A unique list of model ids that are will be requested in the next batch for the current model type
				const queuedModelIds = Array.from(
					new Set(
						this.requestsQueued
							.filter(request => request.payload.modelName)
							.flatMap(request => request.payload.modelIds)
					)
				);
				// A list of model ids responses currently cached
				cachedModelIds = Object.keys(this.responseCache[modelName]);
				// A list of the cached model responses that can safely be deleted, because no queued up request needs it
				const cachedModelIdsToDelete = cachedModelIds.filter(
					cachedModelId => !queuedModelIds.includes(cachedModelId)
				);
				console.log(`Queued model ids`, modelName, queuedModelIds);
				console.log(`Cached model ids`, modelName, cachedModelIds);
				console.log(
					`Cached model ids to delete`,
					modelName,
					cachedModelIdsToDelete
				);

				// TODO In theory, we could check if any of the queued requests can be resolved here. Not worth it at the moment.

				cachedModelIdsToDelete.forEach(cachedModelIdToDelete => {
					delete this.responseCache[modelName][cachedModelIdToDelete];
				});
			});
		}, 25);
	}

	public static fetchModelsByIds(modelName: string, modelIds: string[]) {
		this.responseCache[modelName] ??= {};

		return new Promise((resolve, reject) => {
			const promise = new DeferredPromise();

			// Listens for the deferred promise response, before we actually push and fetch
			promise.promise.then(result => {
				resolve(result);
			});

			promise.promise.catch(err => {
				// TODO in the future, we want to handle these cases differently, returning error per-model or if the entire function failed
				reject(err);
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
