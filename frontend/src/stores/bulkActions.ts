import { defineStore } from "pinia";

// TODO fix/decide eslint rule properly
// eslint-disable-next-line
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
