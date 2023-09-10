import { onBeforeUnmount, ref } from "vue";

export const useModels = () => {
	const models = ref([]);
	const subscriptions = ref({
		created: [],
		updated: [],
		deleted: []
	});

	const onCreated = async (store, callback: (data?: any) => any) => {
		const uuid = await store.onCreated(callback);

		subscriptions.value.created.push({
			store,
			uuid
		});
	};

	const onUpdated = async (store, callback: (data?: any) => any) => {
		const uuid = await store.onUpdated(callback);

		subscriptions.value.updated.push({
			store,
			uuid
		});
	};

	const onDeleted = async (store, callback: (data?: any) => any) => {
		const uuid = await store.onDeleted(callback);

		subscriptions.value.deleted.push({
			store,
			uuid
		});
	};

	const removeCallback = async (
		store,
		type: "created" | "updated" | "deleted",
		uuid: string
	) => {
		if (
			!subscriptions.value[type].find(
				subscription =>
					subscription.store === store && subscription.uuid === uuid
			)
		)
			return;

		await store.removeCallback(type, uuid);

		delete subscriptions.value[type][uuid];
	};

	const registerModels = async (store, storeModels: any[]) => {
		let storeIndex = models.value.findIndex(model => model.store === store);

		const registeredModels = await store.registerModels(storeModels);

		if (storeIndex < 0) {
			models.value.push({
				store,
				models: registeredModels
			});

			await onDeleted(store, ({ oldDoc }) => {
				storeIndex = models.value.findIndex(
					model => model.store === store
				);

				if (storeIndex < 0) return;

				const modelIndex = models.value[storeIndex].models.findIndex(
					model => model._id === oldDoc._id
				);

				if (modelIndex < 0) return;

				delete models.value[storeIndex].models[modelIndex];
			});

			return registeredModels;
		}

		models.value[storeIndex].models = [
			...models.value[storeIndex].models,
			registeredModels
		];

		return registeredModels;
	};

	const unregisterModels = async (store, modelIds: string[]) => {
		const storeIndex = models.value.findIndex(
			model => model.store === store
		);

		if (storeIndex < 0) return;

		const storeModels = models.value[storeIndex].models;

		await store.unregisterModels(
			storeModels
				.filter(model => modelIds.includes(model._id))
				.map(model => model._id)
		);

		models.value[storeIndex].modelIds = storeModels.filter(
			model => !modelIds.includes(model._id)
		);
	};

	onBeforeUnmount(async () => {
		await Promise.all(
			Object.entries(subscriptions.value).map(
				async ([type, _subscriptions]) =>
					Promise.all(
						_subscriptions.map(({ store, uuid }) =>
							removeCallback(store, type, uuid)
						)
					)
			)
		);
		await Promise.all(
			models.value.map(({ store, models: storeModels }) =>
				unregisterModels(
					store,
					storeModels.map(model => model._id)
				)
			)
		);
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
