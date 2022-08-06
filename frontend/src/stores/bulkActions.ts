import { defineStore } from "pinia";

export const useBulkActionsStore = props => {
	const { modalUuid } = props;
	return defineStore(`bulkActions-${modalUuid}`, {
		state: () => ({
			type: null
		}),
		actions: {
			init({ type }) {
				this.type = type;
			}
		}
	})();
};
