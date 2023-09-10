import { Ref, ref } from "vue";
import { useWebsocketStore } from "../websocket";

export const createModelStore = modelName => {
	const { runJob, subscribe, unsubscribe } = useWebsocketStore();

	const models = ref<Ref<any>[]>([]);
	const permissions = ref(null);
	const modelPermissions = ref({});
	const subscriptions = ref({});

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

	const onUpdated = async ({ doc }) => {
		const index = models.value.findIndex(
			model => model.value._id === doc._id
		);
		if (index > -1) models.value[index].value = doc;

		if (modelPermissions.value[doc._id])
			await fetchUserModelPermissions(doc._id);
	};

	const onDeleted = async ({ oldDoc }) => {
		const index = models.value.findIndex(
			model => model.value._id === oldDoc._id
		);
		if (index > -1) await unregisterModels(oldDoc._id);

		if (modelPermissions.value[oldDoc._id])
			delete modelPermissions.value[oldDoc._id];
	};

	const registerModels = async docs =>
		Promise.all(
			(Array.isArray(docs) ? docs : [docs]).map(async _doc => {
				const docRef = ref(_doc);

				if (!models.value.find(model => model.value._id === _doc._id))
					models.value.push(docRef);

				if (subscriptions.value[_doc._id]) return docRef;

				const updatedChannel = `model.${modelName}.updated.${_doc._id}`;
				const updatedUuid = await subscribe(updatedChannel, onUpdated);
				const updated = {
					channel: updatedChannel,
					callback: onUpdated,
					uuid: updatedUuid
				};

				const deletedChannel = `model.${modelName}.deleted.${_doc._id}`;
				const deletedUuid = await subscribe(deletedChannel, onDeleted);
				const deleted = {
					channel: deletedChannel,
					callback: onDeleted,
					uuid: deletedUuid
				};

				subscriptions.value[_doc._id] = {
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
							model => model.value._id === modelId
						) === -1
					)
						return;

					const { updated, deleted } = subscriptions.value[modelId];

					await unsubscribe(updated.channel, updated.uuid);

					await unsubscribe(deleted.channel, deleted.uuid);

					models.value.splice(
						models.value.findIndex(
							model => model.value._id === modelId
						),
						1
					);

					if (modelPermissions.value[modelId])
						delete modelPermissions.value[modelId];
				}
			)
		);

	const create = async query => runJob(`data.${modelName}.create`, { query });

	const findById = async _id => {
		const existingModel = models.value.find(
			model => model.value._id === _id
		);

		if (existingModel) return existingModel;

		const data = await runJob(`data.${modelName}.findById`, { _id });

		const [model] = await registerModels(data);

		return model;
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
