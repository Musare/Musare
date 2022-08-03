import { defineStore } from "pinia";

export const useEditUserStore = props => {
	const { modalUuid } = props;
	return defineStore(`editUser-${modalUuid}`, {
		state: () => ({
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
};