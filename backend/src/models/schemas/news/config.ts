import JobContext from "../../../JobContext";
import { NewsStatus } from "./NewsStatus";
import getData from "./getData";

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
	jobConfig: {
		published: {
			async method() {
				return this.find().published();
			},
			hasPermission: true
		},
		newest: {
			async method(
				context: JobContext,
				payload?: { showToNewUsers?: boolean; limit?: number }
			) {
				const query = this.find().newest(payload?.showToNewUsers);
				if (payload?.limit) return query.limit(payload?.limit);
				return query;
			},
			hasPermission: true
		}
	},
	getData
};
