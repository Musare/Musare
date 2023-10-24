import { useModelStore } from "./stores/model";
import { useWebsocketStore } from "./stores/websocket";

export default class Model {
	private _name: string;

	private _permissions?: object;

	private _subscriptions?: { updated: string; deleted: string };

	private _uses: number;

	constructor(name: string, data: object) {
		this._name = name;
		this._uses = 0;

		Object.assign(this, data);
	}

	public async loadRelations(): Promise<void> {
		if (!this._relations) return;

		const { findById, registerModels } = useModelStore();

		await Promise.all(
			Object.entries(this._relations).map(
				async ([key, { model: modelName }]) => {
					const data = await findById(modelName, this[key]);

					const [model] = await registerModels(modelName, data);

					this[key] = model;
				}
			)
		);
	}

	public async unloadRelations(): Promise<void> {
		if (!this._relations) return;

		const { unregisterModels } = useModelStore();

		const relationIds = Object.fromEntries(
			Object.entries(this._relations).map(([key, value]) => [
				this[key]._id,
				value
			])
		);

		await unregisterModels(Object.values(relationIds));

		Object.apply(this, relationIds);
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
