import { defineStore } from "pinia";

export const useRemoveAccountStore = props => {
	const { modalUuid } = props;
	if (!modalUuid) return null;
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
