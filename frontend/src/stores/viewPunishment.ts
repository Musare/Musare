import { defineStore } from "pinia";

// TODO fix/decide eslint rule properly
// eslint-disable-next-line
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
