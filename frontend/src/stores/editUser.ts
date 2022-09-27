import { defineStore } from "pinia";
import { User } from "@/types/user";

export const useEditUserStore = ({ modalUuid }: { modalUuid: string }) =>
	defineStore(`editUser-${modalUuid}`, {
		state: (): {
			userId: string;
			user: User;
		} => ({
			userId: null,
			user: {}
		}),
		actions: {
			init({ userId }) {
				this.userId = userId;
			},
			setUser(user) {
				this.user = user;
			}
		}
	})();
