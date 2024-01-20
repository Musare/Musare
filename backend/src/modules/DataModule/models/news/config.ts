import { NewsStatus } from "./NewsStatus";
import getData from "./getData";
import { NewsSchemaOptions } from "./schema";

export default {
	documentVersion: 3,
	query: {
		published() {
			return this.where({ status: NewsStatus.PUBLISHED });
		},
		newest(showToNewUsers = false) {
			const query = this.published().sort({ createdAt: "desc" });
			if (showToNewUsers)
				return query.where({ showToNewUsers: !!showToNewUsers });
			return query;
		}
	},
	getData
} as NewsSchemaOptions;
