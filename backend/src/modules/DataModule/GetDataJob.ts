import DataModule from "../DataModule";
import DataModuleJob from "./DataModuleJob";
import { GetData } from "./plugins/getData";

export default abstract class GetDataJob extends DataModuleJob {
	protected async _execute(payload: Parameters<GetData["getData"]>[0]) {
		const model = await DataModule.getModel(this.getModelName());

		return model.getData(payload);
	}
}
