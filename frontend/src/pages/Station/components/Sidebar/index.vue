<template>
	<div id="tabs-container">
		<div id="tab-selection">
			<button
				class="button is-default"
				:class="{ selected: tab === 'queue' }"
				@click="tab = 'queue'"
			>
				Queue
			</button>
			<button
				class="button is-default"
				:class="{ selected: tab === 'users' }"
				@click="tab = 'users'"
			>
				Users
			</button>
			<button
				class="button is-default"
				:class="{ selected: tab === 'my-playlists' }"
				@click="tab = 'my-playlists'"
			>
				My Playlists
			</button>
		</div>
		<queue class="tab" v-if="tab === 'queue'" />
		<users class="tab" v-if="tab === 'users'" />
		<my-playlists class="tab" v-if="tab === 'my-playlists'" />
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
		userCount: state => state.station.userCount
	}),
	methods: {
		...mapActions("modals", ["openModal"])
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
		border-radius: 0;
		border: 0;
		text-transform: uppercase;
		font-size: 17px;
		width: calc(33.3% - 2.5px);
		color: #222;
		background-color: #ddd;

		&:not(:first-of-type) {
			margin-left: 5px;
		}
	}

	.selected {
		background-color: #222;
		color: #fff;
	}
}
</style>
