import { useWebsocketStore } from "./stores/websocket";

const { runJob } = useWebsocketStore();

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

	public getName(): string {
		return this._name;
	}

	public async getPermissions(refresh = false): Promise<object> {
		if (refresh === false && this._permissions) return this._permissions;

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
		return runJob(`data.${this.getName()}.updateById`, {
			_id: this._id,
			query
		});
	}

	public async delete() {
		return runJob(`data.${this.getName()}.deleteById`, { _id: this._id });
	}
}
