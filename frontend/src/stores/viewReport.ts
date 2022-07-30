import { defineStore } from "pinia";

// TODO fix/decide eslint rule properly
// eslint-disable-next-line
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
