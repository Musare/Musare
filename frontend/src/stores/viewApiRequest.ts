import { defineStore } from "pinia";

export const useViewApiRequestStore = props => {
	const { modalUuid } = props;
	return defineStore(`viewApiRequest-${modalUuid}`, {
		state: () => ({
			requestId: null,
			request: {},
			removeAction: null
		}),
		actions: {
			init({ requestId, removeAction }) {
				this.requestId = requestId;
				this.removeAction = removeAction;
			},
			viewApiRequest(request) {
				this.request = request;
			}
		}
	})();
};
