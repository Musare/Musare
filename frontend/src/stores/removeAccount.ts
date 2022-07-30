import { defineStore } from "pinia";

// TODO fix/decide eslint rule properly
// eslint-disable-next-line
export const useRemoveAccountStore = props => {
	const { modalUuid } = props;
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
