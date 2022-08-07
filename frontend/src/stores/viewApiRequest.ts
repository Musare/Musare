import { defineStore } from "pinia";

export const useViewApiRequestStore = props => {
	const { modalUuid } = props;
	return defineStore(`viewApiRequest-${modalUuid}`, {
		state: () => ({
			requestId: null,
			request: {
				_id: null,
				url: null,
				params: {},
				results: [],
				date: null,
				quotaCost: null
			},
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
