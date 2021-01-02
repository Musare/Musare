/* eslint no-param-reassign: 0 */

const state = {
	originalUser: {},
	modifiedUser: {}
};

const getters = {
	isGithubLinked: state => state.originalUser.github,
	isPasswordLinked: state => state.originalUser.password
};

const actions = {
	updateOriginalUser: ({ commit }, payload) => {
		commit("updateOriginalUser", payload);
	},
	setUser: ({ commit }, user) => {
		commit("setUser", user);
	}
};

const mutations = {
	updateOriginalUser(state, payload) {
		const { property, value } = payload;

		property.split(".").reduce(
			// eslint-disable-next-line no-return-assign
			(o, p, i) =>
				(o[p] =
					// eslint-disable-next-line no-plusplus
					property.split(".").length === ++i
						? JSON.parse(JSON.stringify(value))
						: o[p] || {}),
			state.originalUser
		);
	},
	setUser(state, user) {
		state.originalUser = user;
		state.modifiedUser = JSON.parse(JSON.stringify(user));
	}
};

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
};
