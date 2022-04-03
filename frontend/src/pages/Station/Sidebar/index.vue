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
				v-if="canRequest()"
				class="button is-default"
				:class="{ selected: tab === 'request' }"
				@click="showTab('request')"
			>
				Request
			</button>
			<button
				v-else-if="canRequest(false)"
				class="button is-default"
				content="Login to request songs"
				v-tippy="{ theme: 'info' }"
			>
				Request
			</button>
		</div>
		<queue class="tab" v-show="tab === 'queue'" />
		<users class="tab" v-show="tab === 'users'" />
		<request
			v-if="canRequest()"
			v-show="tab === 'request'"
			class="tab requests-tab"
			sector="station"
		/>
	</div>
</template>

<script>
import { mapActions, mapState } from "vuex";

import Queue from "@/components/Queue.vue";
import TabQueryHandler from "@/mixins/TabQueryHandler.vue";
import Users from "./Users.vue";
import Request from "@/components/Request.vue";

export default {
	components: { Queue, Users, Request },
	mixins: [TabQueryHandler],
	data() {
		return {
			tab: "queue"
		};
	},
	computed: mapState({
		station: state => state.station.station,
		users: state => state.station.users,
		userCount: state => state.station.userCount,
		userId: state => state.user.auth.userId,
		loggedIn: state => state.user.auth.loggedIn,
		role: state => state.user.auth.role
	}),
	watch: {
		// eslint-disable-next-line
		"station.requests": function (requests) {
			if (this.tab === "request" && !this.canRequest())
				this.showTab("queue");
		}
	},
	mounted() {
		if (
			this.$route.query.tab === "queue" ||
			this.$route.query.tab === "users" ||
			this.$route.query.tab === "request"
		)
			this.tab = this.$route.query.tab;
	},
	methods: {
		isOwner() {
			return (
				this.loggedIn &&
				this.station &&
				this.userId === this.station.owner
			);
		},
		isAdmin() {
			return this.loggedIn && this.role === "admin";
		},
		isOwnerOrAdmin() {
			return this.isOwner() || this.isAdmin();
		},
		canRequest(loggedIn = true) {
			return (
				this.station &&
				(!loggedIn || this.loggedIn) &&
				this.station.requests &&
				this.station.requests.enabled &&
				(this.station.requests.access === "user" ||
					(this.station.requests.access === "owner" &&
						this.isOwnerOrAdmin()))
			);
		},
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>

<style lang="less" scoped>
.night-mode {
	#tab-selection .button {
		background: var(--dark-grey);
		color: var(--white);
	}

	.tab.requests-tab {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;
	}
}

#tabs-container .tab {
	width: 100%;
	height: calc(100% - 36px);
	position: absolute;
	border: 1px solid var(--light-grey-3);
	border-top: 0;
}

#tab-selection {
	display: flex;
	overflow-x: auto;

	.button {
		border-radius: @border-radius @border-radius 0 0;
		border: 0;
		text-transform: uppercase;
		font-size: 17px;
		color: var(--dark-grey-3);
		background-color: var(--light-grey-2);
		flex-grow: 1;

		&:not(:first-of-type) {
			margin-left: 5px;
		}
	}

	.selected {
		background-color: var(--primary-color) !important;
		color: var(--white) !important;
		font-weight: 600;
	}
}

:deep(.nothing-here-text) {
	height: 100%;
}

:deep(.tab) {
	.nothing-here-text:not(:only-child) {
		height: calc(100% - 40px);
	}

	&.requests-tab {
		background-color: var(--white);
		margin-bottom: 20px;
		border-radius: 0 0 @border-radius @border-radius;
		max-height: 100%;
		padding: 15px 10px;
		overflow-y: auto;

		.scrollable-list {
			padding: 10px 0;
		}
	}
}

:deep(.tab-actionable-button) {
	width: calc(100% - 20px);
	height: 40px;
	border-radius: @border-radius;
	margin: 10px;
	position: absolute;
	bottom: 0;
	border: 0;
	background-color: var(--primary-color) !important;
	color: var(--white) !important;

	&:active,
	&:focus {
		border: 0;
	}

	&:hover,
	&:focus {
		background-color: var(--primary-color) !important;
		filter: brightness(90%);
	}
}

:deep(.scrollable-list) {
	width: 100%;
	max-height: calc(100% - 40px - 20px);
	overflow: auto;
	padding: 10px;

	.song-item:not(:last-of-type) {
		margin-bottom: 10px;
	}
}
</style>
