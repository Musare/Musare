import { defineStore } from "pinia";

export const useRemoveAccountStore = props => {
	const { modalUuid } = props;
	if (!modalUuid || modalUuid === "") return false;
	return defineStore(`removeAccount-${modalUuid}`, {
		state: () => ({
			githubLinkConfirmed: false
		}),
		actions: {
			init({ githubLinkConfirmed }) {
				this.githubLinkConfirmed = !!githubLinkConfirmed;
			}
		}
	})();
};
