import { defineStore } from "pinia";
import { User } from "@/types/user";

export const useEditUserStore = props => {
	const { modalUuid } = props;
	return defineStore(`editUser-${modalUuid}`, {
		state: () => ({
			userId: null,
			user: <User>{}
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
};
