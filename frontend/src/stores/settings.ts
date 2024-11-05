import { defineStore } from "pinia";
import { User } from "@/types/user";

export const useSettingsStore = defineStore("settings", {
	state: (): {
		originalUser: User;
		modifiedUser: User;
	} => ({
		originalUser: {},
		modifiedUser: {}
	}),
	actions: {
		updateOriginalUser(payload) {
			const { property, value } = payload;

			property.split(".").reduce(
				// eslint-disable-next-line no-return-assign
				(o, p, i) =>
					(o[p] =
						// eslint-disable-next-line no-plusplus
						property.split(".").length === ++i
							? JSON.parse(JSON.stringify(value))
							: o[p] || {}),
				this.originalUser
			);
		},
		setUser(user) {
			this.originalUser = user;
			this.modifiedUser = JSON.parse(JSON.stringify(user));
		}
	},
	getters: {
		isPasswordLinked: state => state.originalUser.password
	}
});
