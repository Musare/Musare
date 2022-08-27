import { defineStore } from "pinia";

export const useViewReportStore = props => {
	const { modalUuid } = props;
	if (!modalUuid) return null;
	return defineStore(`viewReport-${modalUuid}`, {
		state: () => ({
			reportId: null
		}),
		actions: {
			init({ reportId }) {
				this.reportId = reportId;
			}
		}
	})();
};
