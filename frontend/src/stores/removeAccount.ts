import { defineStore } from "pinia";

export const useRemoveAccountStore = ({ modalUuid }: { modalUuid: string }) =>
	defineStore(`removeAccount-${modalUuid}`, {
		state: () => ({
			githubLinkConfirmed: false
		}),
		actions: {
			init({ githubLinkConfirmed }) {
				this.githubLinkConfirmed = !!githubLinkConfirmed;
			}
		}
	})();
