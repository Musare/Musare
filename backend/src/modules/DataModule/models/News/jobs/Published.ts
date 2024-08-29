import News from "@models/News";
import { NewsStatus } from "@models/News/NewsStatus";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";

export default class Published extends DataModuleJob {
	protected static _model = News;

	protected static _hasPermission = true;

	protected async _execute() {
		return this.getModel().findAll({
			where: {
				status: NewsStatus.PUBLISHED
			}
		});
	}
}
