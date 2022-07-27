/* eslint no-param-reassign: 0 */

import { defineStore } from "pinia";

// TODO fix/decide eslint rule properly
// eslint-disable-next-line
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
