import { defineStore } from "pinia";

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
