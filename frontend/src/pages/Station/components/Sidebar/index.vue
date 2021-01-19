<template>
	<div id="tabs-container">
		<div id="tab-selection">
			<button
				class="button is-default"
				:class="{ selected: tab === 'queue' }"
				@click="showTab('queue')"
			>
				Queue
			</button>
			<button
				class="button is-default"
				:class="{ selected: tab === 'users' }"
				@click="showTab('users')"
			>
				Users
			</button>
			<button
				v-if="loggedIn"
				class="button is-default"
				:class="{ selected: tab === 'my-playlists' }"
				@click="showTab('my-playlists')"
			>
				My Playlists
			</button>
		</div>
		<queue class="tab" v-show="tab === 'queue'" />
		<users class="tab" v-show="tab === 'users'" />
		<my-playlists class="tab" v-show="tab === 'my-playlists'" />
	</div>
</template>

<script>
import { mapActions, mapState } from "vuex";

import Queue from "./Queue/index.vue";
import Users from "./Users.vue";
import MyPlaylists from "./MyPlaylists.vue";

export default {
	components: { Queue, Users, MyPlaylists },
	data() {
		return {
			tab: "queue"
		};
	},
	computed: mapState({
		users: state => state.station.users,
		userCount: state => state.station.userCount,
		loggedIn: state => state.user.auth.loggedIn
	}),
	mounted() {
		if (
			this.$route.query.tab === "queue" ||
			this.$route.query.tab === "users" ||
			this.$route.query.tab === "my-playlists"
		)
			this.tab = this.$route.query.tab;
	},
	methods: {
		...mapActions("modals", ["openModal"]),
		showTab(tab) {
			const queries = this.$route.query.tab
				? this.$route.query
				: { ...this.$route.query, tab };

			queries.tab = tab;
			this.$route.query.tab = tab;
			this.tab = this.$route.query.tab;

			// eslint-disable-next-line no-restricted-globals
			history.pushState(
				{},
				null,
				`${this.$route.path}?${Object.keys(queries)
					.map(key => {
						return `${encodeURIComponent(key)}=${encodeURIComponent(
							queries[key]
						)}`;
					})
					.join("&")}`
			);
		}
	}
};
</script>

<style lang="scss" scoped>
@import "../../../../styles/global.scss";

#tabs-container {
	width: 100%;
	top: 0;
	position: absolute;
}

#tab-selection {
	display: flex;

	.button {
		border-radius: 5px 5px 0 0;
		border: 0;
		text-transform: uppercase;
		font-size: 17px;
		color: $night-mode-bg-secondary;
		background-color: $night-mode-text;
		flex-grow: 1;

		&:not(:first-of-type) {
			margin-left: 5px;
		}
	}

	.selected {
		background-color: $night-mode-bg-secondary;
		color: #fff;
	}
}
</style>
