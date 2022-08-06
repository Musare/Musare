import { defineStore } from "pinia";

export const useCreateStationStore = props => {
	const { modalUuid } = props;
	if (!modalUuid || modalUuid === "") return false;
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
