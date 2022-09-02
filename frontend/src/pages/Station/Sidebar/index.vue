<script setup lang="ts">
import { useRoute } from "vue-router";
import { defineAsyncComponent, watch, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useUserAuthStore } from "@/stores/userAuth";
import { useStationStore } from "@/stores/station";
import { useTabQueryHandler } from "@/composables/useTabQueryHandler";

const Queue = defineAsyncComponent(() => import("@/components/Queue.vue"));
const Users = defineAsyncComponent(
	() => import("@/pages/Station/Sidebar/Users.vue")
);
const Request = defineAsyncComponent(() => import("@/components/Request.vue"));

const route = useRoute();
const userAuthStore = useUserAuthStore();
const stationStore = useStationStore();

const { tab, showTab } = useTabQueryHandler("queue");

const { loggedIn } = storeToRefs(userAuthStore);
const { station } = storeToRefs(stationStore);
const { hasPermission } = stationStore;

const canRequest = (requireLogin = true) =>
	station.value &&
	(!requireLogin || loggedIn.value) &&
	station.value.requests &&
	station.value.requests.enabled &&
	(station.value.requests.access === "user" ||
		(station.value.requests.access === "owner" &&
			hasPermission("stations.request")));

watch(
	() => [station.value.requests, hasPermission("stations.request")],
	() => {
		if (tab.value === "request" && !canRequest()) showTab("queue");
	}
);

onMounted(() => {
	if (
		route.query.tab === "queue" ||
		route.query.tab === "users" ||
		route.query.tab === "request"
	)
		tab.value = route.query.tab;
});
</script>

<template>
	<div class="tabs-container">
		<div class="tab-selection">
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
		<Queue class="tab" v-show="tab === 'queue'" />
		<Users class="tab" v-show="tab === 'users'" />
		<Request
			v-if="canRequest()"
			v-show="tab === 'request'"
			class="tab requests-tab"
			sector="station"
		/>
	</div>
</template>

<style lang="less" scoped>
.night-mode {
	.tab-selection .button {
		background: var(--dark-grey);
		color: var(--white);
	}

	.tab.requests-tab {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;
	}
}

.tabs-container .tab {
	width: 100%;
	height: calc(100% - 36px);
	position: absolute;
	border: 1px solid var(--light-grey-3);
	border-top: 0;
}

.tab-selection {
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
