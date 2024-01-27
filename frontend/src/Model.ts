import { forEachIn } from "@common/utils/forEachIn";
import { useModelStore } from "./stores/model";
import { useWebsocketStore } from "./stores/websocket";

export default class Model {
	private _permissions?: object;

	private _subscriptions?: { updated: string; deleted: string };

	private _uses: number;

	private _loadedRelations: string[];

	constructor(data: object) {
		this._uses = 0;
		this._loadedRelations = [];

		Object.assign(this, data);
	}

	private async _getRelations(
		model?: object,
		path?: string
	): Promise<string[]> {
		const relationPaths = await Object.entries(model ?? this)
			.filter(
				([key, value]) =>
					!key.startsWith("_") &&
					(typeof value === "object" || Array.isArray(value))
			)
			.reduce(async (_modelIds, [key, value]) => {
				const paths = await _modelIds;

				path = path ? `${path}.${key}` : key;

				if (typeof value === "object" && value._id) paths.push(path);
				else if (Array.isArray(value))
					await forEachIn(value, async item => {
						if (typeof item !== "object") return;

						if (item._id) paths.push(path);
						else
							paths.push(
								...(await this._getRelations(item, path))
							);
					});
				else paths.push(...(await this._getRelations(value, path)));

				return paths;
			}, Promise.resolve([]));

		return relationPaths.filter(
			(relationPath, index) =>
				relationPaths.indexOf(relationPath) === index
		);
	}

	private async _getRelation(key: string) {
		let relation = JSON.parse(JSON.stringify(this));
		key.split(".").forEach(property => {
			if (Number.isInteger(property))
				property = Number.parseInt(property);

			relation = relation[property];
		});
		return relation;
	}

	private async _loadRelation(
		model: object,
		path: string,
		force: boolean,
		pathParts?: string[]
	): Promise<void> {
		const parts = path.split(".");
		let [head] = parts;
		const [, ...rest] = parts;
		let [next] = rest;

		if (Number.isInteger(head)) head = Number.parseInt(head);

		if (Number.isInteger(next)) next = Number.parseInt(next);

		pathParts ??= [];

		pathParts.push(head);

		if (Array.isArray(model[head])) {
			await forEachIn(
				model[head],
				async (item, index) => {
					let itemPath = `${index}`;

					if (rest.length > 0) itemPath += `.${rest.join(".")}`;

					await this._loadRelation(model[head], itemPath, force, [
						...pathParts
					]);
				},
				{ concurrency: 1 }
			);

			return;
		}

		if (rest.length > 0 && model[next] === null) {
			await this._loadRelation(
				model[head],
				rest.join("."),
				force,
				pathParts
			);

			return;
		}

		const fullPath = pathParts.join(".");

		if (force || !this._loadedRelations.includes(fullPath)) {
			const { findById, registerModels } = useModelStore();

			const data = await findById(model[head]._name, model[head]._id);

			const [registeredModel] = await registerModels(data);

			model[head] = registeredModel;

			this._loadedRelations.push(fullPath);
		}

		if (rest.length === 0) return;

		await model[head].loadRelations(rest.join("."));
	}

	public async loadRelations(
		relations?: string | string[],
		force = false
	): Promise<void> {
		if (relations)
			relations = Array.isArray(relations) ? relations : [relations];

		await forEachIn(relations ?? [], async path => {
			await this._loadRelation(this, path, force);
		});
	}

	public async unregisterRelations(): Promise<void> {
		const { unregisterModels } = useModelStore();
		const relationIds = await forEachIn(
			this._loadedRelations,
			async path => {
				const relation = await this._getRelation(path);
				return relation._id;
			}
		);
		await unregisterModels(relationIds);
	}

	public async updateData(data: object) {
		await this.unregisterRelations();

		Object.assign(this, data);

		await this.loadRelations(this._loadedRelations, true);

		await this.refreshPermissions();
	}

	public getName(): string {
		return this._name;
	}

	public async getPermissions(refresh = false): Promise<object> {
		if (refresh === false && this._permissions) return this._permissions;

		const { runJob } = useWebsocketStore();

		this._permissions = await runJob("data.users.getModelPermissions", {
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
