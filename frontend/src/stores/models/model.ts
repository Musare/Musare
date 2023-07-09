import { Ref, ref } from "vue";
import { useWebsocketStore } from "../websocket";

export const createModelStore = modelName => {
	const { runJob, subscribe, unsubscribe } = useWebsocketStore();

	const models = ref<Ref<any>[]>([]);
	const permissions = ref(null);
	const modelPermissions = ref({});

	const onUpdated = async ({ doc }) => {
		const index = models.value.findIndex(
			model => model.value._id === doc._id
		);
		if (index > -1) models.value[index].value = doc;
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

				await subscribe(
					`model.${modelName}.updated.${_doc._id}`,
					onUpdated
				);

				await subscribe(
					`model.${modelName}.deleted.${_doc._id}`,
					onDeleted
				);

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

					await unsubscribe(
						`model.${modelName}.updated.${modelId}`,
						onUpdated
					);

					await unsubscribe(
						`model.${modelName}.deleted.${modelId}`,
						onDeleted
					);

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

	const getUserModelPermissions = async (_id?: string) => {
		if (!_id && permissions.value) return permissions.value;

		if (_id && modelPermissions.value[_id])
			return modelPermissions.value[_id];

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

	const hasPermission = async (permission: string, _id?: string) => {
		const data = await getUserModelPermissions(_id);

		return !!data[permission];
	};

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
		registerModels,
		unregisterModels,
		getUserModelPermissions,
		hasPermission,
		create,
		findById,
		updateById,
		deleteById
	};
};
