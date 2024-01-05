import DataModule from "../DataModule";
import DataModuleJob from "./DataModuleJob";

export default abstract class CreateJob extends DataModuleJob {
	protected async _execute({ query }: { query: Record<string, any[]> }) {
		if (typeof query !== "object")
			throw new Error("Query is not an object");
		if (Object.keys(query).length === 0)
			throw new Error("Empty query object provided");

		const model = await DataModule.getModel(this.getModelName());

		if (model.schema.path("createdBy"))
			query.createdBy = (await this._context.getUser())._id;

		return model.create(query);
	}
}
