<script setup lang="ts">
import { useRoute } from "vue-router";
import { defineAsyncComponent, ref, onMounted } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useWebsocketsStore } from "@/stores/websockets";
import { useStationStore } from "@/stores/station";
import { useUserAuthStore } from "@/stores/userAuth";

const ProfilePicture = defineAsyncComponent(
	() => import("@/components/ProfilePicture.vue")
);

const stationStore = useStationStore();
const route = useRoute();

const notesUri = ref("");
const frontendDomain = ref("");
const tab = ref("active");
const tabs = ref([]);

const { socket } = useWebsocketsStore();

const { station, users, userCount } = storeToRefs(stationStore);

const { hasPermission } = useUserAuthStore();

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
						<li v-for="user in users.loggedIn" :key="user.username">
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
									v-if="user._id === station.owner"
									class="material-icons user-rank"
									content="Station Owner"
									v-tippy="{ theme: 'info' }"
									>local_police</span
								>
								<span
									v-else-if="
										station.djs.find(
											dj => dj._id === user._id
										)
									"
									class="material-icons user-rank"
									content="Station DJ"
									v-tippy="{ theme: 'info' }"
									>shield</span
								>

								<button
									v-if="
										hasPermission('stations.djs.add') &&
										!station.djs.find(
											dj => dj._id === user._id
										) &&
										station.owner !== user._id
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
										station.djs.find(
											dj => dj._id === user._id
										)
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
					</ul>
				</aside>
			</div>
			<div
				v-if="hasPermission('stations.update')"
				class="tab"
				v-show="tab === 'djs'"
			>
				<h5 class="has-text-centered">Station DJs</h5>
				<h6 class="has-text-centered">
					Add/remove DJs, who can manage the station and queue.
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
			margin-bottom: 20px;
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
			.menu {
				margin-top: 20px;
				width: 100%;
				overflow: auto;
				height: calc(100% - 20px - 40px);

				.menu-list {
					margin-left: 0;
					padding: 0;
				}

				li {
					&:not(:first-of-type) {
						margin-top: 10px;
					}

					a {
						display: flex;
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
					}
				}
			}

			h5 {
				font-size: 20px;
			}
		}
	}
}
</style>
