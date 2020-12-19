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
	updateOriginalUser: ({ commit }, property, value) => {
		commit("updateOriginalUser", property, value);
	},
	setUser: ({ commit }, user) => {
		commit("setUser", user);
	}
};

const mutations = {
	updateOriginalUser(state, property, value) {
		state.originalUser[property] = value;
	},
	setUser(state, user) {
		state.originalUser = state.modifiedUser = user;
	}
};

export default {
	namespaced: true,
	state,
	getters,
	actions,
	mutations
};
