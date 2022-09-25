import { defineStore } from "pinia";

export const useCreateStationStore = ({ modalUuid }: { modalUuid: string }) =>
	defineStore(`createStation-${modalUuid}`, {
		state: () => ({
			official: false
		}),
		actions: {
			init({ official }) {
				this.official = !!official;
			}
		}
	})();
