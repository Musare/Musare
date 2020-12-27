/* eslint no-param-reassign: 0 */

const state = {
	originalUser: {},
	modifiedUser: {}
};

const getters = {
	isGithubLinked: state => state.modifiedUser.github,
	isPasswordLinked: state => state.modifiedUser.password
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
		state.originalUser[property] = JSON.parse(JSON.stringify(value));
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
