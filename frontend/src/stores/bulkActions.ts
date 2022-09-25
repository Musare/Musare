import { defineStore } from "pinia";

export const useBulkActionsStore = ({ modalUuid }: { modalUuid: string }) =>
	defineStore(`bulkActions-${modalUuid}`, {
		state: () => ({
			type: null
		}),
		actions: {
			init({ type }) {
				this.type = type;
			}
		}
	})();
