import { defineStore } from "pinia";

export const useViewReportStore = props => {
	const { modalUuid } = props;
	if (!modalUuid || modalUuid === "") return false;
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
