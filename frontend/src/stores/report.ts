import { defineStore } from "pinia";

export const useReportStore = props => {
	const { modalUuid } = props;
	return defineStore(`report-${modalUuid}`, {
		state: () => ({
			song: {}
		}),
		actions: {
			init({ song }) {
				this.song = song;
			}
		}
	})();
};
