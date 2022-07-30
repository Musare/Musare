import { defineStore } from "pinia";

// TODO fix/decide eslint rule properly
// eslint-disable-next-line
export const useCreateStationStore = props => {
	const { modalUuid } = props;
	return defineStore(`createStation-${modalUuid}`, {
		state: () => ({
			official: false
		}),
		actions: {
			init({ official }) {
				this.official = !!official;
			}
		}
	})();
};
