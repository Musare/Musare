import { defineStore } from "pinia";

export const useViewReportStore = props => {
	const { modalUuid } = props;
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
