import News from "@models/News";
import { FindOptions, WhereOptions, Op } from "sequelize";
import GetDataJob from "@/modules/DataModule/GetDataJob";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default class GetData extends GetDataJob {
	protected static _model = News;

	protected static _hasPermission = isAdmin;

	protected _specialProperties?: Record<
		string,
		(query: FindOptions<News>) => FindOptions<News>
	> = {
		createdBy: query => query
	};

	protected _specialQueries?: Record<
		string,
		(where: WhereOptions<News>) => WhereOptions<News>
	> = {
		createdBy: where => ({
			...where,
			[Op.or]: [
				{ createdBy: where.createdBy },
				{ createdByUsername: where.createdBy }
			],
			createdBy: undefined
		})
	};
}
