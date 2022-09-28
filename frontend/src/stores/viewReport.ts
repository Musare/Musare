import { defineStore } from "pinia";

export const useViewReportStore = ({ modalUuid }: { modalUuid: string }) =>
	defineStore(`viewReport-${modalUuid}`, {
		state: (): {
			reportId: string;
		} => ({
			reportId: null
		}),
		actions: {
			init({ reportId }: { reportId: string }) {
				this.reportId = reportId;
			}
		}
	})();
