import DataModule from "../DataModule";
import DataModuleJob from "./DataModuleJob";

export default abstract class CreateJob extends DataModuleJob {
	protected override async _validate() {
		if (typeof this._payload !== "object" || this._payload === null)
			throw new Error("Payload must be an object");

		if (typeof this._payload.query !== "object")
			throw new Error("Query is not an object");

		if (Object.keys(this._payload.query).length === 0)
			throw new Error("Empty query object provided");
	}

	protected async _execute({ query }: { query: Record<string, any[]> }) {
		const model = await DataModule.getModel(this.getModelName());

		if (model.schema.path("createdBy"))
			query.createdBy = (await this._context.getUser())._id;

		return model.create(query);
	}
}
