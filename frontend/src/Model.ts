import { useModelStore } from "./stores/model";
import { useWebsocketStore } from "./stores/websocket";

export default class Model {
	private _permissions?: object;

	private _subscriptions?: { updated: string; deleted: string };

	private _uses: number;

	constructor(data: object) {
		this._uses = 0;

		Object.assign(this, data);
	}

	private async _loadRelation(relation: object): Promise<object> {
		const { findById, registerModels } = useModelStore();

		const data = await findById(relation._name, relation._id);

		const [model] = await registerModels(data);

		return model;
	}

	private async _loadRelations(model: object): Promise<object> {
		const relations = Object.fromEntries(
			await Promise.all(
				Object.entries(model)
					.filter(
						([, value]) =>
							typeof value === "object" || Array.isArray(value)
					)
					.map(async ([key, value]) => {
						if (
							typeof value === "object" &&
							value._id &&
							value._name
						)
							return [key, await this._loadRelation(value)];

						if (Array.isArray(value))
							return [
								key,
								await Promise.all(
									value.map(async item => {
										if (typeof item !== "object")
											return item;

										if (item._id && item._name)
											return this._loadRelation(item);

										return this._loadRelations(item);
									})
								)
							];

						return [key, await this._loadRelations(value)];
					})
			)
		);

		Object.assign(model, relations);

		return model;
	}

	public async loadRelations(): Promise<void> {
		await this._loadRelations(this);
	}

	private async _getRelationIds(model: object): Promise<string[]> {
		const relationIds = await Object.values(model)
			.filter(value => typeof value === "object" || Array.isArray(value))
			.reduce(async (_modelIds, value) => {
				const modelIds = await _modelIds;

				if (typeof value === "object" && value._id)
					modelIds.push(value._id);
				else if (Array.isArray(value))
					await Promise.all(
						value.map(async item => {
							if (typeof item !== "object") return;

							if (item._id) modelIds.push(item._id);
							else
								modelIds.push(
									...(await this._getRelationIds(item))
								);
						})
					);
				else modelIds.push(...(await this._getRelationIds(value)));

				return modelIds;
			}, Promise.resolve([]));

		return relationIds.filter(
			(relationId, index) => relationIds.indexOf(relationId) === index
		);
	}

	public async unregisterRelations(): Promise<void> {
		const { unregisterModels } = useModelStore();

		const relationIds = await this._getRelationIds(this);

		await unregisterModels(relationIds);
	}

	public async updateData(data: object) {
		await this.unregisterRelations();

		Object.assign(this, data);

		await this.loadRelations();

		await this.refreshPermissions();
	}

	public getName(): string {
		return this._name;
	}

	public async getPermissions(refresh = false): Promise<object> {
		if (refresh === false && this._permissions) return this._permissions;

		const { runJob } = useWebsocketStore();

		this._permissions = await runJob("api.getUserModelPermissions", {
			modelName: this._name,
			modelId: this._id
		});

		return this._permissions;
	}

	public async refreshPermissions(): Promise<void> {
		if (this._permissions) this.getPermissions(true);
	}

	public async hasPermission(permission: string): Promise<boolean> {
		const permissions = await this.getPermissions();

		return !!permissions[permission];
	}

	public getSubscriptions() {
		return this._subscriptions;
	}

	public setSubscriptions(updated: string, deleted: string): void {
		this._subscriptions = { updated, deleted };
	}

	public getUses(): number {
		return this._uses;
	}

	public addUse(): void {
		this._uses += 1;
	}

	public removeUse(): void {
		this._uses -= 1;
	}

	public toJSON(): object {
		return Object.fromEntries(
			Object.entries(this).filter(
				([key, value]) =>
					(!key.startsWith("_") || key === "_id") &&
					typeof value !== "function"
			)
		);
	}

	public async update(query: object) {
		const { runJob } = useWebsocketStore();

		return runJob(`data.${this.getName()}.updateById`, {
			_id: this._id,
			query
		});
	}

	public async delete() {
		const { runJob } = useWebsocketStore();

		return runJob(`data.${this.getName()}.deleteById`, { _id: this._id });
	}
}
