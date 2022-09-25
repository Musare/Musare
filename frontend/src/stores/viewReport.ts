import { defineStore } from "pinia";

export const useViewReportStore = ({ modalUuid }: { modalUuid: string }) =>
	defineStore(`viewReport-${modalUuid}`, {
		state: () => ({
			reportId: null
		}),
		actions: {
			init({ reportId }) {
				this.reportId = reportId;
			}
		}
	})();
