import { DeferredPromise } from "@common/DeferredPromise";
import { forEachIn } from "@common/utils/forEachIn";
import { useWebsocketStore } from "./stores/websocket";

export interface ModelPermissionFetcherRequest {
	promise: DeferredPromise;
	payload: {
		modelName: string;
		modelId: string;
	};
}

/**
 * Class used for fetching model permissions in bulk, every 25ms max
 * So if there's 200 models loaded, it would do only 1 request to fetch model permissions, not 200 separate ones
 */
export class ModelPermissionFetcher {
	private static requestsQueued: ModelPermissionFetcherRequest[] = [];

	private static timeoutActive = false;

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

			// Runs the requests per model
			forEachIn(modelNames, async modelName => {
				// Gets a unique list of all model ids for the current model that we want to request permissions for
				const modelIds = Array.from(
					new Set(
						requestsPerModel[modelName].map(
							request => request.payload.modelId
						)
					)
				);

				const result = await runJob("data.users.getModelPermissions", {
					modelName,
					modelIds
				});

				const requests = requestsPerModel[modelName];
				// For all requests, resolve the deferred promise with the returned permissions for the model that request requested
				requests.forEach(request => {
					const { payload, promise } = request;
					const { modelId } = payload;
					promise.resolve(result[modelId]);
				});
			});
		}, 25);
	}

	public static fetchModelPermissions(modelName, modelId) {
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
					modelId
				},
				promise
			});

			// Calls the fetch function, which will start a timeout if one isn't already running, which will actually request the permissions
			this.fetch();
		});
	}
}
