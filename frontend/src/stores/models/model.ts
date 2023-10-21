import { reactive, ref } from "vue";
import { useWebsocketStore } from "../websocket";
import utils from "@/utils";

export const createModelStore = modelName => {
	const { runJob, subscribe, unsubscribe } = useWebsocketStore();

	const models = ref([]);
	const modelUses = ref({});
	const permissions = ref(null);
	const modelPermissions = ref({});
	const createdSubcription = ref(null);
	const subscriptions = ref({
		models: {},
		created: {},
		updated: {},
		deleted: {}
	});

	const fetchUserModelPermissions = async (_id?: string) => {
		const data = await runJob("api.getUserModelPermissions", {
			modelName,
			modelId: _id
		});

		if (_id) {
			modelPermissions.value[_id] = data;

			return modelPermissions.value[_id];
		}

		permissions.value = data;

		return permissions.value;
	};

	const getUserModelPermissions = async (_id?: string) => {
		if (!_id && permissions.value) return permissions.value;

		if (_id && modelPermissions.value[_id])
			return modelPermissions.value[_id];

		return fetchUserModelPermissions(_id);
	};

	const hasPermission = async (permission: string, _id?: string) => {
		const data = await getUserModelPermissions(_id);

		return !!data[permission];
	};

	const onCreatedCallback = async data => {
		await Promise.all(
			Object.values(subscriptions.value.created).map(
				async subscription => subscription(data) // TODO: Error handling
			)
		);
	};

	const onCreated = async (callback: (data?: any) => any) => {
		if (!createdSubcription.value)
			createdSubcription.value = await subscribe(
				`model.${modelName}.created`,
				onCreatedCallback
			);

		const uuid = utils.guid();

		subscriptions.value.created[uuid] = callback;

		return uuid;
	};

	const onUpdated = async (callback: (data?: any) => any) => {
		const uuid = utils.guid();

		subscriptions.value.updated[uuid] = callback;

		return uuid;
	};

	const onUpdatedCallback = async ({ doc }) => {
		const index = models.value.findIndex(model => model._id === doc._id);
		if (index > -1) Object.assign(models.value[index], doc);

		if (modelPermissions.value[doc._id])
			await fetchUserModelPermissions(doc._id);

		await Promise.all(
			Object.values(subscriptions.value.updated).map(
				async subscription => subscription(data) // TODO: Error handling
			)
		);
	};

	const onDeleted = async (callback: (data?: any) => any) => {
		const uuid = utils.guid();

		subscriptions.value.deleted[uuid] = callback;

		return uuid;
	};

	const onDeletedCallback = async data => {
		const { oldDoc } = data;

		await Promise.all(
			Object.values(subscriptions.value.deleted).map(
				async subscription => subscription(data) // TODO: Error handling
			)
		);

		const index = models.value.findIndex(model => model._id === oldDoc._id);
		if (index > -1) await unregisterModels(oldDoc._id);

		if (modelPermissions.value[oldDoc._id])
			delete modelPermissions.value[oldDoc._id];
	};

	const removeCallback = async (
		type: "created" | "updated" | "deleted",
		uuid: string
	) => {
		if (!subscriptions.value[type][uuid]) return;

		delete subscriptions.value[type][uuid];

		if (
			type === "created" &&
			Object.keys(subscriptions.value.created).length === 0
		) {
			await unsubscribe(
				`model.${modelName}.created`,
				createdSubcription.value
			);

			createdSubcription.value = null;
		}
	};

	const registerModels = async docs =>
		Promise.all(
			(Array.isArray(docs) ? docs : [docs]).map(async _doc => {
				const existingRef = models.value.find(
					model => model._id === _doc._id
				);

				const docRef = existingRef ?? reactive(_doc);

				if (!existingRef) {
					models.value.push(docRef);
				}

				modelUses.value[_doc._id] =
					(modelUses.value[_doc._id] ?? 0) + 1;

				if (subscriptions.value.models[_doc._id]) return docRef;

				const updatedChannel = `model.${modelName}.updated.${_doc._id}`;
				const updatedUuid = await subscribe(
					updatedChannel,
					onUpdatedCallback
				);
				const updated = {
					channel: updatedChannel,
					callback: onUpdatedCallback,
					uuid: updatedUuid
				};

				const deletedChannel = `model.${modelName}.deleted.${_doc._id}`;
				const deletedUuid = await subscribe(
					deletedChannel,
					onDeletedCallback
				);
				const deleted = {
					channel: deletedChannel,
					callback: onDeletedCallback,
					uuid: deletedUuid
				};

				subscriptions.value.models[_doc._id] = {
					updated,
					deleted
				};

				return docRef;
			})
		);

	const unregisterModels = async modelIds =>
		Promise.all(
			(Array.isArray(modelIds) ? modelIds : [modelIds]).map(
				async modelId => {
					if (
						models.value.findIndex(
							model => model._id === modelId
						) === -1
					)
						return;

					if (modelUses.value[modelId] > 1) {
						modelUses.value[modelId] -= 1;

						return;
					}

					const { updated, deleted } =
						subscriptions.value.models[modelId];

					await unsubscribe(updated.channel, updated.uuid);

					await unsubscribe(deleted.channel, deleted.uuid);

					delete subscriptions.value.models[modelId];

					models.value.splice(
						models.value.findIndex(model => model._id === modelId),
						1
					);

					if (modelPermissions.value[modelId])
						delete modelPermissions.value[modelId];

					if (modelUses.value[modelId])
						delete modelUses.value[modelId];
				}
			)
		);

	const create = async query => runJob(`data.${modelName}.create`, { query });

	const findById = async _id => {
		const existingModel = models.value.find(model => model._id === _id);

		if (existingModel) return existingModel;

		return runJob(`data.${modelName}.findById`, { _id });
	};

	const updateById = async (_id, query) =>
		runJob(`data.${modelName}.updateById`, { _id, query });

	const deleteById = async _id =>
		runJob(`data.${modelName}.deleteById`, { _id });

	return {
		models,
		permissions,
		modelPermissions,
		subscriptions,
		onCreated,
		onUpdated,
		onDeleted,
		removeCallback,
		registerModels,
		unregisterModels,
		fetchUserModelPermissions,
		getUserModelPermissions,
		hasPermission,
		create,
		findById,
		updateById,
		deleteById
	};
};
