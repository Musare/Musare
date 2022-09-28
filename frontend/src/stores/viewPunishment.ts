import { defineStore } from "pinia";

export const useViewPunishmentStore = ({ modalUuid }: { modalUuid: string }) =>
	defineStore(`viewPunishment-${modalUuid}`, {
		state: (): {
			punishmentId: string;
			punishment: {
				_id: string;
			};
		} => ({
			punishmentId: null,
			punishment: {
				_id: null
			}
		}),
		actions: {
			init({ punishmentId }: { punishmentId: string }) {
				this.punishmentId = punishmentId;
			},
			viewPunishment(punishment) {
				this.punishment = punishment;
			},
			deactivatePunishment() {
				this.punishment.active = false;
			}
		}
	})();
