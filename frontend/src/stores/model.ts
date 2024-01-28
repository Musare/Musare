import { reactive, ref, computed } from "vue";
import { defineStore } from "pinia";
import { generateUuid } from "@common/utils/generateUuid";
import { forEachIn } from "@common/utils/forEachIn";
import { useWebsocketStore } from "./websocket";
import Model from "@/Model";

export const useModelStore = defineStore("model", () => {
	const { runJob, subscribe, subscribeMany, unsubscribe, unsubscribeMany } =
		useWebsocketStore();

	const models = ref([]);
	const permissions = ref({});
	const createdSubcription = ref(null);
	const subscriptions = ref({
		created: {},
		updated: {},
		deleted: {}
	});
	const loadedModelIds = computed(() =>
		models.value.map(model => `${model._name}.${model._id}`)
	);

	const getUserModelPermissions = async (modelName: string) => {
		if (permissions.value[modelName]) return permissions.value[modelName];

		const data = await runJob("data.users.getModelPermissions", {
			modelName
		});

		permissions.value[modelName] = data;

		return permissions.value[modelName];
	};

	const hasPermission = async (modelName: string, permission: string) => {
		const data = await getUserModelPermissions(modelName);

		return !!data[permission];
	};

	const unregisterModels = async modelIds => {
		const removeModels = [];

		await forEachIn(
			Array.isArray(modelIds) ? modelIds : [modelIds],
			async modelId => {
				const model = models.value.find(model => model._id === modelId);

				if (!model) return;

				model?.removeUse();

				if (model.getUses() > 1) return;

				removeModels.push(model);
			}
		);

		if (removeModels.length === 0) return;

		await forEachIn(removeModels, async model =>
			model.unregisterRelations()
		);

		const subscriptions = Object.fromEntries(
			removeModels.flatMap(model => {
				const { updated, deleted } = model.getSubscriptions() ?? {};

				return [
					[updated, `model.${model.getName()}.updated.${model._id}`],
					[deleted, `model.${model.getName()}.deleted.${model._id}`]
				];
			})
		);

		await unsubscribeMany(subscriptions);

		await forEachIn(removeModels, async removeModel => {
			models.value.splice(
				models.value.findIndex(model => model._id === removeModel._id),
				1
			);
		});
	};

	const onCreatedCallback = async (modelName: string, data) => {
		if (!subscriptions.value.created[modelName]) return;

		await forEachIn(
			Object.values(subscriptions.value.created[modelName]),
			async subscription => subscription(data) // TODO: Error handling
		);
	};

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

		subscriptions.value.created[modelName] ??= {};
		subscriptions.value.created[modelName][uuid] = callback;

		return uuid;
	};

	const onUpdated = async (
		modelName: string,
		callback: (data?: any) => any
	) => {
		const uuid = generateUuid();

		subscriptions.value.updated[modelName] ??= {};
		subscriptions.value.updated[modelName][uuid] = callback;

		return uuid;
	};

	const onUpdatedCallback = async (modelName: string, { doc }) => {
		const model = models.value.find(model => model._id === doc._id);
		if (model) model.updateData(doc);

		if (!subscriptions.value.updated[modelName]) return;

		await forEachIn(
			Object.values(subscriptions.value.updated[modelName]),
			async subscription => subscription(data) // TODO: Error handling
		);
	};

	const onDeleted = async (
		modelName: string,
		callback: (data?: any) => any
	) => {
		const uuid = generateUuid();

		subscriptions.value.deleted[modelName] ??= {};
		subscriptions.value.deleted[modelName][uuid] = callback;

		return uuid;
	};

	const onDeletedCallback = async (modelName: string, data) => {
		const { oldDoc } = data;

		if (subscriptions.value.deleted[modelName])
			await forEachIn(
				Object.values(subscriptions.value.deleted[modelName]),
				async subscription => subscription(data) // TODO: Error handling
			);

		const index = models.value.findIndex(model => model._id === oldDoc._id);
		if (index > -1) await unregisterModels(oldDoc._id);
	};

	const removeCallback = async (
		modelName: string,
		type: "created" | "updated" | "deleted",
		uuid: string
	) => {
		if (
			!subscriptions.value[type][modelName] ||
			!subscriptions.value[type][modelName][uuid]
		)
			return;

		delete subscriptions.value[type][modelName][uuid];

		if (
			type === "created" &&
			Object.keys(subscriptions.value.created[modelName]).length === 0
		) {
			await unsubscribe(
				`model.${modelName}.created`,
				createdSubcription.value
			);

			createdSubcription.value = null;
		}
	};

	const registerModels = async (
		docs,
		relations?: Record<string, string | string[]>
	) => {
		const documents = Array.isArray(docs) ? docs : [docs];

		const existingsRefs = documents.filter(document =>
			models.value.find(
				model =>
					model._id === document._id && model._name === document._name
			)
		);

		await forEachIn(existingsRefs, async model => {
			model.addUse();

			if (relations && relations[model._name])
				await model.loadRelations(relations[model._name]);
		});

		if (documents.length === existingsRefs.length) return existingsRefs;

		const missingDocuments = documents.filter(
			document =>
				!loadedModelIds.value.includes(
					`${document._name}.${document._id}`
				)
		);

		const channels = Object.fromEntries(
			missingDocuments.flatMap(document => [
				[
					`model.${document._name}.updated.${document._id}`,
					data => onUpdatedCallback(document._name, data)
				],
				[
					`model.${document._name}.deleted.${document._id}`,
					data => onDeletedCallback(document._name, data)
				]
			])
		);
		const subscriptions = Object.entries(await subscribeMany(channels));

		const newRefs = await forEachIn(missingDocuments, async document => {
			const refSubscriptions = subscriptions.filter(([, { channel }]) =>
				channel.endsWith(document._id)
			);
			const [updated] = refSubscriptions.find(([, { channel }]) =>
				channel.includes("updated")
			);
			const [deleted] = refSubscriptions.find(([, { channel }]) =>
				channel.includes("deleted")
			);

			if (!updated || !deleted) return null;

			const model = reactive(new Model(document));
			model.setSubscriptions(updated, deleted);
			model.addUse();

			if (relations && relations[model._name])
				await model.loadRelations(relations[model._name]);

			return model;
		});

		models.value.push(...newRefs);

		return existingsRefs.concat(newRefs);
	};

	const findById = async (modelName: string, _id) => {
		const existingModel = models.value.find(model => model._id === _id);

		if (existingModel) return existingModel;

		return runJob(`data.${modelName}.findById`, { _id });
	};

	const findManyById = async (modelName: string, _ids: string[]) => {
		const existingModels = models.value.filter(model =>
			_ids.includes(model._id)
		);
		const existingIds = existingModels.map(model => model._id);
		const missingIds = _ids.filter(_id => !existingIds.includes(_id));

		let fetchedModels = [];
		if (missingIds.length > 0)
			fetchedModels = (await runJob(`data.${modelName}.findManyById`, {
				_ids: missingIds
			})) as unknown[];

		const allModels = existingModels.concat(fetchedModels);

		return Object.fromEntries(
			_ids.map(_id => [_id, allModels.find(model => model._id === _id)])
		);
	};

	const loadModels = async (
		modelName: string,
		modelIdsOrModelId: string | string[],
		relations?: Record<string, string | string[]>
	) => {
		const modelIds = Array.isArray(modelIdsOrModelId)
			? modelIdsOrModelId
			: [modelIdsOrModelId];
		const existingModels = models.value.filter(model =>
			modelIds.includes(model._id)
		);
		const missingModelIds = modelIds.filter(
			modelId => !loadedModelIds.value.includes(`${modelName}.${modelId}`)
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
					!registeredModels.find(model => model._id === modelId)
			)
			.map(modelId => [modelId, null]);

		return Object.fromEntries(
			registeredModels
				.map(model => [model._id, model])
				.concat(modelsNotFound)
		);
	};

	return {
		models,
		permissions,
		subscriptions,
		onCreated,
		onUpdated,
		onDeleted,
		removeCallback,
		registerModels,
		unregisterModels,
		getUserModelPermissions,
		hasPermission,
		findById,
		findManyById,
		loadModels
	};
});
