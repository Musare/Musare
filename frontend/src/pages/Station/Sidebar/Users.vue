<script setup lang="ts">
import { useRoute } from "vue-router";
import {
	defineAsyncComponent,
	ref,
	reactive,
	computed,
	watch,
	onMounted
} from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useWebsocketsStore } from "@/stores/websockets";
import { useStationStore } from "@/stores/station";

const ProfilePicture = defineAsyncComponent(
	() => import("@/components/ProfilePicture.vue")
);

const stationStore = useStationStore();
const route = useRoute();

const notesUri = ref("");
const frontendDomain = ref("");
const tab = ref("active");
const tabs = ref([]);
const search = reactive({
	query: "",
	searchedQuery: "",
	page: 0,
	count: 0,
	resultsLeft: 0,
	pageSize: 0,
	results: []
});

const { socket } = useWebsocketsStore();

const { station, users, userCount } = storeToRefs(stationStore);

const isOwner = userId => station.value.owner === userId;
const isDj = userId => !!station.value.djs.find(dj => dj._id === userId);

const sortedUsers = computed(() =>
	users.value && users.value.loggedIn
		? users.value.loggedIn
				.slice()
				.sort(
					(a, b) =>
						Number(isOwner(b._id)) - Number(isOwner(a._id)) ||
						Number(!isOwner(a._id)) - Number(!isOwner(b._id))
				)
		: []
);

const resultsLeftCount = computed(() => search.count - search.results.length);

const nextPageResultsCount = computed(() =>
	Math.min(search.pageSize, resultsLeftCount.value)
);

const { hasPermission } = stationStore;

const copyToClipboard = async () => {
	try {
		await navigator.clipboard.writeText(
			frontendDomain.value + route.fullPath
		);
	} catch (err) {
		new Toast("Failed to copy to clipboard.");
	}
};

const showTab = _tab => {
	if (tabs.value[`${_tab}-tab`])
		tabs.value[`${_tab}-tab`].scrollIntoView({ block: "nearest" });
	tab.value = _tab;
};

const addDj = userId => {
	socket.dispatch("stations.addDj", station.value._id, userId, res => {
		new Toast(res.message);
	});
};

const removeDj = userId => {
	socket.dispatch("stations.removeDj", station.value._id, userId, res => {
		new Toast(res.message);
	});
};

const searchForUser = page => {
	if (search.page >= page || search.searchedQuery !== search.query) {
		search.results = [];
		search.page = 0;
		search.count = 0;
		search.resultsLeft = 0;
		search.pageSize = 0;
	}

	search.searchedQuery = search.query;
	socket.dispatch("users.search", search.query, page, res => {
		const { data } = res;
		if (res.status === "success") {
			const { count, pageSize, users } = data;
			search.results = [...search.results, ...users];
			search.page = page;
			search.count = count;
			search.resultsLeft = count - search.results.length;
			search.pageSize = pageSize;
		} else if (res.status === "error") {
			search.results = [];
			search.page = 0;
			search.count = 0;
			search.resultsLeft = 0;
			search.pageSize = 0;
			new Toast(res.message);
		}
	});
};

watch(
	() => hasPermission("stations.update"),
	value => {
		if (!value && (tab.value === "djs" || tab.value === "add-dj"))
			showTab("active");
	}
);

onMounted(async () => {
	frontendDomain.value = await lofig.get("frontendDomain");
	notesUri.value = encodeURI(`${frontendDomain.value}/assets/notes.png`);
});
</script>

<template>
	<div id="users">
		<div class="tabs-container">
			<div v-if="hasPermission('stations.update')" class="tab-selection">
				<button
					class="button is-default"
					:ref="el => (tabs['active-tab'] = el)"
					:class="{ selected: tab === 'active' }"
					@click="showTab('active')"
				>
					Active
				</button>
				<button
					class="button is-default"
					:ref="el => (tabs['djs-tab'] = el)"
					:class="{ selected: tab === 'djs' }"
					@click="showTab('djs')"
				>
					DJs
				</button>
				<button
					class="button is-default"
					:ref="el => (tabs['add-dj-tab'] = el)"
					:class="{ selected: tab === 'add-dj' }"
					@click="showTab('add-dj')"
				>
					Add DJ
				</button>
			</div>
			<div class="tab" v-show="tab === 'active'">
				<h5 class="has-text-centered">Total users: {{ userCount }}</h5>

				<transition-group name="notification-box">
					<h6
						class="has-text-centered"
						v-if="
							users.loggedIn &&
							users.loggedOut &&
							((users.loggedIn.length === 1 &&
								users.loggedOut.length === 0) ||
								(users.loggedIn.length === 0 &&
									users.loggedOut.length === 1))
						"
						key="only-me"
					>
						It's just you in the station!
					</h6>
					<h6
						class="has-text-centered"
						v-else-if="
							users.loggedIn &&
							users.loggedOut &&
							users.loggedOut.length > 0
						"
						key="logged-out-users"
					>
						{{ users.loggedOut.length }}
						{{
							users.loggedOut.length > 1 ? "users are" : "user is"
						}}
						logged-out.
					</h6>
				</transition-group>

				<aside class="menu">
					<ul class="menu-list scrollable-list">
						<li v-for="user in sortedUsers" :key="user.username">
							<router-link
								:to="{
									name: 'profile',
									params: { username: user.username }
								}"
								target="_blank"
							>
								<div class="left">
									<profile-picture
										:avatar="user.avatar"
										:name="user.name || user.username"
									/>

									{{ user.name || user.username }}

									<span
										v-if="isOwner(user._id)"
										class="material-icons user-rank"
										content="Station Owner"
										v-tippy="{ theme: 'info' }"
										>local_police</span
									>
									<span
										v-else-if="isDj(user._id)"
										class="material-icons user-rank"
										content="Station DJ"
										v-tippy="{ theme: 'info' }"
										>shield</span
									>

									<button
										v-if="
											hasPermission('stations.djs.add') &&
											!isDj(user._id) &&
											!isOwner(user._id)
										"
										class="button is-primary material-icons"
										@click.prevent="addDj(user._id)"
										content="Promote user to DJ"
										v-tippy
									>
										add_moderator
									</button>
									<button
										v-else-if="
											hasPermission(
												'stations.djs.remove'
											) && isDj(user._id)
										"
										class="button is-danger material-icons"
										@click.prevent="removeDj(user._id)"
										content="Demote user from DJ"
										v-tippy
									>
										remove_moderator
									</button>
								</div>

								<div class="user-state">
									<i
										class="material-icons"
										v-if="user.state === 'participate'"
										v-tippy
										content="Participating"
										>group</i
									>
									<i
										class="material-icons"
										v-if="user.state === 'local_paused'"
										v-tippy
										content="Paused"
										>pause</i
									>
									<i
										class="material-icons"
										v-if="user.state === 'muted'"
										v-tippy
										content="Muted"
										>volume_mute</i
									>
									<i
										class="material-icons"
										v-if="user.state === 'playing'"
										v-tippy
										content="Listening to music"
										>play_arrow</i
									>
									<i
										class="material-icons"
										v-if="user.state === 'buffering'"
										v-tippy
										content="Buffering"
										>warning</i
									>
								</div>
							</router-link>
						</li>
					</ul>
				</aside>
			</div>
			<div
				v-if="hasPermission('stations.update')"
				class="tab"
				v-show="tab === 'djs'"
			>
				<h5 class="has-text-centered">Station DJs</h5>
				<h6 v-if="station.djs.length === 0" class="has-text-centered">
					There are currently no DJs.
				</h6>
				<aside class="menu">
					<ul class="menu-list scrollable-list">
						<li v-for="dj in station.djs" :key="dj._id">
							<router-link
								:to="{
									name: 'profile',
									params: { username: dj.username }
								}"
								target="_blank"
							>
								<profile-picture
									:avatar="dj.avatar"
									:name="dj.name || dj.username"
								/>

								{{ dj.name || dj.username }}

								<span
									class="material-icons user-rank"
									content="Station DJ"
									v-tippy="{ theme: 'info' }"
									>shield</span
								>

								<button
									v-if="hasPermission('stations.djs.remove')"
									class="button is-danger material-icons"
									@click.prevent="removeDj(dj._id)"
									content="Demote user from DJ"
									v-tippy
								>
									remove_moderator
								</button>
							</router-link>
						</li>
					</ul>
				</aside>
			</div>
			<div
				v-if="hasPermission('stations.update')"
				class="tab add-dj-tab"
				v-show="tab === 'add-dj'"
			>
				<h5 class="has-text-centered">Add Station DJ</h5>
				<h6 class="has-text-centered">
					Search for users to promote to DJ.
				</h6>

				<div class="control is-grouped input-with-button">
					<p class="control is-expanded">
						<input
							class="input"
							type="text"
							placeholder="Enter your user query here..."
							v-model="search.query"
							@keyup.enter="searchForUser(1)"
						/>
					</p>
					<p class="control">
						<button
							class="button is-primary"
							@click="searchForUser(1)"
						>
							<i class="material-icons icon-with-button">search</i
							>Search
						</button>
					</p>
				</div>

				<aside class="menu">
					<ul class="menu-list scrollable-list">
						<li v-for="user in search.results" :key="user.username">
							<router-link
								:to="{
									name: 'profile',
									params: { username: user.username }
								}"
								target="_blank"
							>
								<profile-picture
									:avatar="user.avatar"
									:name="user.name || user.username"
								/>

								{{ user.name || user.username }}

								<span
									v-if="isOwner(user._id)"
									class="material-icons user-rank"
									content="Station Owner"
									v-tippy="{ theme: 'info' }"
									>local_police</span
								>
								<span
									v-else-if="isDj(user._id)"
									class="material-icons user-rank"
									content="Station DJ"
									v-tippy="{ theme: 'info' }"
									>shield</span
								>

								<button
									v-if="
										hasPermission('stations.djs.add') &&
										!isDj(user._id) &&
										!isOwner(user._id)
									"
									class="button is-primary material-icons"
									@click.prevent="addDj(user._id)"
									content="Promote user to DJ"
									v-tippy
								>
									add_moderator
								</button>
								<button
									v-else-if="
										hasPermission('stations.djs.remove') &&
										isDj(user._id)
									"
									class="button is-danger material-icons"
									@click.prevent="removeDj(user._id)"
									content="Demote user from DJ"
									v-tippy
								>
									remove_moderator
								</button>
							</router-link>
						</li>
						<button
							v-if="resultsLeftCount > 0"
							class="button is-primary load-more-button"
							@click="searchForUser(search.page + 1)"
						>
							Load {{ nextPageResultsCount }} more results
						</button>
					</ul>
				</aside>
			</div>
		</div>

		<button
			class="button is-primary tab-actionable-button"
			@click="copyToClipboard()"
		>
			<i class="material-icons icon-with-button">share</i>
			<span> Share (copy to clipboard) </span>
		</button>
	</div>
</template>

<style lang="less" scoped>
.night-mode {
	#users {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;
	}

	a {
		color: var(--light-grey-2);
		background-color: var(--dark-grey-2) !important;
		border: 0 !important;

		&:hover {
			color: var(--light-grey) !important;
		}
	}

	.tabs-container .tab-selection .button {
		background: var(--dark-grey) !important;
		color: var(--white) !important;
	}
}

.notification-box-enter-active,
.fade-leave-active {
	transition: opacity 0.5s;
}
.notification-box-enter,
.notification-box-leave-to {
	opacity: 0;
}

#users {
	background-color: var(--white);
	margin-bottom: 20px;
	border-radius: 0 0 @border-radius @border-radius;
	max-height: 100%;
	.tabs-container {
		padding: 10px;

		.tab-selection {
			display: flex;
			overflow-x: auto;
			margin-bottom: 10px;
			.button {
				border-radius: 0;
				border: 0;
				text-transform: uppercase;
				font-size: 14px;
				color: var(--dark-grey-3);
				background-color: var(--light-grey-2);
				flex-grow: 1;
				height: 32px;

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
		.tab {
			position: absolute;
			height: calc(100% - 120px);
			width: calc(100% - 20px);
			overflow-y: auto;

			.menu {
				margin-top: 20px;
				width: 100%;

				.menu-list {
					margin-left: 0;
					padding: 0;
					&.scrollable-list {
						max-height: unset;
					}
				}

				li {
					&:not(:first-of-type) {
						margin-top: 10px;
					}

					a {
						display: flex;
						flex-direction: row;
						align-items: center;
						padding: 5px 10px;
						border: 0.5px var(--light-grey-3) solid;
						border-radius: @border-radius;
						cursor: pointer;

						&:hover {
							background-color: var(--light-grey);
							color: var(--black);
						}

						.profile-picture {
							margin-right: 10px;
							width: 36px;
							height: 36px;
						}

						:deep(.profile-picture.using-initials span) {
							font-size: calc(
								36px / 5 * 2
							); // 2/5th of .profile-picture height/width
						}

						.user-rank {
							color: var(--primary-color);
							font-size: 18px;
							margin: 0 5px;
						}

						.button {
							margin-left: auto;
							font-size: 18px;
							width: 36px;
						}

						.left {
							display: flex;
							align-items: center;
							flex: 1;
						}

						.user-state {
							display: flex;
						}
					}
				}
			}

			h5 {
				font-size: 20px;
			}

			&.add-dj-tab {
				.control.is-grouped.input-with-button {
					margin: 20px 0 0 0 !important;
					& > .control {
						margin-bottom: 0 !important;
					}
				}

				.menu {
					margin-top: 10px;
				}

				.load-more-button {
					width: 100%;
					margin-top: 10px;
				}
			}
		}
	}
}
</style>
