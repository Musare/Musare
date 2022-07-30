import { defineStore } from "pinia";

// TODO fix/decide eslint rule properly
// eslint-disable-next-line
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
