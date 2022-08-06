import { defineStore } from "pinia";

export const useBulkActionsStore = props => {
	const { modalUuid } = props;
	if (!modalUuid || modalUuid === "") return false;
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
