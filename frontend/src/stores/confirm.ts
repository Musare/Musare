import { defineStore } from "pinia";

export const useConfirmStore = props => {
	const { modalUuid } = props;
	if (!modalUuid) return null;
	return defineStore(`confirm-${modalUuid}`, {
		state: () => ({
			message: "",
			onCompleted: null,
			action: null,
			params: null
		}),
		actions: {
			init({ message, onCompleted, action, params }) {
				this.message = message;
				this.onCompleted = onCompleted;
				this.action = action;
				this.params = params;
			},
			confirm() {
				this.onCompleted({
					action: this.action,
					params: this.params
				});
			}
		}
	})();
};
