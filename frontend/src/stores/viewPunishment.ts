import { defineStore } from "pinia";

export const useViewPunishmentStore = props => {
	const { modalUuid } = props;
	return defineStore(`viewPunishment-${modalUuid}`, {
		state: () => ({
			punishmentId: null,
			punishment: {}
		}),
		actions: {
			init({ punishmentId }) {
				this.punishmentId = punishmentId;
			},
			viewPunishment(punishment) {
				this.punishment = punishment;
			}
		}
	})();
};