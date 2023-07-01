<script setup lang="ts">
import {
	defineAsyncComponent,
	ref,
	watch,
	onMounted,
	onBeforeUnmount
} from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useWebsocketsStore } from "@/stores/websockets";
import { useUserAuthStore } from "@/stores/userAuth";
import { useModalsStore } from "@/stores/modals";
import { useManageStationStore } from "@/stores/manageStation";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const Queue = defineAsyncComponent(() => import("@/components/Queue.vue"));
const MediaItem = defineAsyncComponent(
	() => import("@/components/MediaItem.vue")
);
const StationInfoBox = defineAsyncComponent(
	() => import("@/components/StationInfoBox.vue")
);
const Settings = defineAsyncComponent(() => import("./Settings.vue"));
const PlaylistTabBase = defineAsyncComponent(
	() => import("@/components/PlaylistTabBase.vue")
);
const Request = defineAsyncComponent(() => import("@/components/Request.vue"));
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true },
	stationId: { type: String, required: true },
	sector: { type: String, default: "admin" }
});

const tabs = ref([]);

const userAuthStore = useUserAuthStore();
const { loggedIn, currentUser } = storeToRefs(userAuthStore);

const { socket } = useWebsocketsStore();

const manageStationStore = useManageStationStore({
	modalUuid: props.modalUuid
});
const {
	stationId,
	sector,
	tab,
	station,
	stationPlaylist,
	autofill,
	blacklist,
	stationPaused,
	currentSong
} = storeToRefs(manageStationStore);
const {
	editStation,
	setAutofillPlaylists,
	setBlacklist,
	clearStation,
	updateSongsList,
	updateStationPlaylist,
	repositionSongInList,
	updateStationPaused,
	updateCurrentSong,
	updateStation,
	updateIsFavorited,
	hasPermission,
	addDj,
	removeDj,
	updatePermissions
} = manageStationStore;

const { closeCurrentModal } = useModalsStore();

const showTab = payload => {
	if (tabs.value[`${payload}-tab`])
		tabs.value[`${payload}-tab`].scrollIntoView({ block: "nearest" });
	manageStationStore.showTab(payload);
};

const canRequest = () =>
	station.value &&
	loggedIn.value &&
	station.value.requests &&
	station.value.requests.enabled &&
	(station.value.requests.access === "user" ||
		(station.value.requests.access === "owner" &&
			hasPermission("stations.request")));

const removeStation = () => {
	socket.dispatch("stations.remove", stationId.value, res => {
		new Toast(res.message);
	});
};

const resetQueue = () => {
	socket.dispatch("stations.resetQueue", stationId.value, res => {
		if (res.status !== "success")
			new Toast({
				content: `Error: ${res.message}`,
				timeout: 8000
			});
		else new Toast({ content: res.message, timeout: 4000 });
	});
};

const findTabOrClose = () => {
	if (hasPermission("stations.update")) return showTab("settings");
	if (canRequest()) return showTab("request");
	if (hasPermission("stations.autofill")) return showTab("autofill");
	if (hasPermission("stations.blacklist")) return showTab("blacklist");
	if (
		!(
			sector.value === "home" &&
			(hasPermission("stations.view") ||
				station.value.privacy === "public")
		)
	)
		return closeCurrentModal(true);
	return null;
};

watch(
	() => hasPermission("stations.update"),
	value => {
		if (!value && tab.value === "settings") findTabOrClose();
	}
);
watch(
	() => hasPermission("stations.request") && station.value.requests.enabled,
	value => {
		if (!value && tab.value === "request") findTabOrClose();
	}
);
watch(
	() => hasPermission("stations.autofill") && station.value.autofill.enabled,
	value => {
		if (!value && tab.value === "autofill") findTabOrClose();
	}
);
watch(
	() => hasPermission("stations.blacklist"),
	value => {
		if (!value && tab.value === "blacklist") findTabOrClose();
	}
);

onMounted(() => {
	manageStationStore.init({
		stationId: props.stationId,
		sector: props.sector
	});

	socket.onConnect(() => {
		socket.dispatch(
			`stations.getStationById`,
			stationId.value,
			async res => {
				if (res.status === "success") {
					editStation(res.data.station);

					await updatePermissions();

					findTabOrClose();

					const currentSong = res.data.station.currentSong
						? res.data.station.currentSong
						: {};

					updateCurrentSong(currentSong);

					updateStationPaused(res.data.station.paused);

					socket.dispatch(
						"stations.getStationAutofillPlaylistsById",
						stationId.value,
						res => {
							if (res.status === "success")
								setAutofillPlaylists(res.data.playlists);
						}
					);

					socket.dispatch(
						"stations.getStationBlacklistById",
						stationId.value,
						res => {
							if (res.status === "success")
								setBlacklist(res.data.playlists);
						}
					);

					if (hasPermission("stations.view")) {
						socket.dispatch(
							"playlists.getPlaylistForStation",
							stationId.value,
							true,
							res => {
								if (res.status === "success") {
									updateStationPlaylist(res.data.playlist);
								}
							}
						);
					}

					socket.dispatch(
						"stations.getQueue",
						stationId.value,
						res => {
							if (res.status === "success")
								updateSongsList(res.data.queue);
						}
					);

					socket.dispatch(
						"apis.joinRoom",
						`manage-station.${stationId.value}`
					);
				} else {
					new Toast(`Station with that ID not found`);
					closeCurrentModal();
				}
			}
		);

		socket.on(
			"event:station.updated",
			res => {
				updateStation(res.data.station);
			},
			{ modalUuid: props.modalUuid }
		);

		socket.on(
			"event:station.autofillPlaylist",
			res => {
				const { playlist } = res.data;
				const playlistIndex = autofill.value
					.map(autofillPlaylist => autofillPlaylist._id)
					.indexOf(playlist._id);
				if (playlistIndex === -1) autofill.value.push(playlist);
			},
			{ modalUuid: props.modalUuid }
		);

		socket.on(
			"event:station.blacklistedPlaylist",
			res => {
				const { playlist } = res.data;
				const playlistIndex = blacklist.value
					.map(blacklistedPlaylist => blacklistedPlaylist._id)
					.indexOf(playlist._id);
				if (playlistIndex === -1) blacklist.value.push(playlist);
			},
			{ modalUuid: props.modalUuid }
		);

		socket.on(
			"event:station.removedAutofillPlaylist",
			res => {
				const { playlistId } = res.data;
				const playlistIndex = autofill.value
					.map(playlist => playlist._id)
					.indexOf(playlistId);
				if (playlistIndex >= 0) autofill.value.splice(playlistIndex, 1);
			},
			{ modalUuid: props.modalUuid }
		);

		socket.on(
			"event:station.removedBlacklistedPlaylist",
			res => {
				const { playlistId } = res.data;
				const playlistIndex = blacklist.value
					.map(playlist => playlist._id)
					.indexOf(playlistId);
				if (playlistIndex >= 0)
					blacklist.value.splice(playlistIndex, 1);
			},
			{ modalUuid: props.modalUuid }
		);

		socket.on(
			"event:station.deleted",
			() => {
				new Toast(`The station you were editing was deleted.`);
				closeCurrentModal(true);
			},
			{ modalUuid: props.modalUuid }
		);

		socket.on(
			"event:user.station.favorited",
			res => {
				if (res.data.stationId === stationId.value)
					updateIsFavorited(true);
			},
			{ modalUuid: props.modalUuid }
		);

		socket.on(
			"event:user.station.unfavorited",
			res => {
				if (res.data.stationId === stationId.value)
					updateIsFavorited(false);
			},
			{ modalUuid: props.modalUuid }
		);

		socket.on(
			"event:manageStation.queue.updated",
			res => {
				if (res.data.stationId === stationId.value)
					updateSongsList(res.data.queue);
			},
			{ modalUuid: props.modalUuid }
		);

		socket.on(
			"event:manageStation.queue.song.repositioned",
			res => {
				if (res.data.stationId === stationId.value)
					repositionSongInList(res.data.song);
			},
			{ modalUuid: props.modalUuid }
		);

		socket.on(
			"event:station.pause",
			res => {
				if (res.data.stationId === stationId.value)
					updateStationPaused(true);
			},
			{ modalUuid: props.modalUuid }
		);

		socket.on(
			"event:station.resume",
			res => {
				if (res.data.stationId === stationId.value)
					updateStationPaused(false);
			},
			{ modalUuid: props.modalUuid }
		);

		socket.on(
			"event:station.nextSong",
			res => {
				if (res.data.stationId === stationId.value)
					updateCurrentSong(res.data.currentSong || {});
			},
			{ modalUuid: props.modalUuid }
		);

		socket.on("event:manageStation.djs.added", res => {
			if (res.data.stationId === stationId.value) {
				if (res.data.user._id === currentUser.value._id)
					updatePermissions();
				addDj(res.data.user);
			}
		});

		socket.on("event:manageStation.djs.removed", res => {
			if (res.data.stationId === stationId.value) {
				if (res.data.user._id === currentUser.value._id)
					updatePermissions();
				removeDj(res.data.user);
			}
		});

		socket.on("keep.event:user.role.updated", () => {
			updatePermissions();
		});

		if (hasPermission("stations.view")) {
			socket.on(
				"event:playlist.song.added",
				res => {
					if (stationPlaylist.value._id === res.data.playlistId)
						stationPlaylist.value.songs.push(res.data.song);
				},
				{
					modalUuid: props.modalUuid
				}
			);

			socket.on(
				"event:playlist.song.removed",
				res => {
					if (stationPlaylist.value._id === res.data.playlistId) {
						// remove song from array of playlists
						stationPlaylist.value.songs.forEach((song, index) => {
							if (song.mediaSource === res.data.mediaSource)
								stationPlaylist.value.songs.splice(index, 1);
						});
					}
				},
				{
					modalUuid: props.modalUuid
				}
			);

			socket.on(
				"event:playlist.song.replaced",
				res => {
					if (stationPlaylist.value._id === res.data.playlistId)
						stationPlaylist.value.songs =
							stationPlaylist.value.songs.map(song =>
								song.mediaSource === res.data.oldMediaSource
									? res.data.song
									: song
							);
				},
				{
					modalUuid: props.modalUuid
				}
			);

			socket.on(
				"event:playlist.songs.repositioned",
				res => {
					if (stationPlaylist.value._id === res.data.playlistId) {
						// for each song that has a new position
						res.data.songsBeingChanged.forEach(changedSong => {
							stationPlaylist.value.songs.forEach(
								(song, index) => {
									// find song locally
									if (
										song.mediaSource ===
										changedSong.mediaSource
									) {
										// change song position attribute
										stationPlaylist.value.songs[
											index
										].position = changedSong.position;

										// reposition in array if needed
										if (index !== changedSong.position - 1)
											stationPlaylist.value.songs.splice(
												changedSong.position - 1,
												0,
												stationPlaylist.value.songs.splice(
													index,
													1
												)[0]
											);
									}
								}
							);
						});
					}
				},
				{
					modalUuid: props.modalUuid
				}
			);
		}
	});
});

onBeforeUnmount(() => {
	socket.dispatch(
		"apis.leaveRoom",
		`manage-station.${stationId.value}`,
		() => {}
	);

	if (hasPermission("stations.update")) showTab("settings");
	clearStation();

	// Delete the Pinia store that was created for this modal, after all other cleanup tasks are performed
	manageStationStore.$dispose();
});
</script>

<template>
	<modal
		v-if="station"
		:title="
			sector === 'home' && !hasPermission('stations.view.manage')
				? 'View Queue'
				: !hasPermission('stations.view.manage')
				? 'Add Song to Queue'
				: 'Manage Station'
		"
		:style="`--primary-color: var(--${station.theme})`"
		class="manage-station-modal"
		:size="
			hasPermission('stations.view.manage') || sector !== 'home'
				? 'wide'
				: null
		"
		:split="hasPermission('stations.view.manage') || sector !== 'home'"
	>
		<template #body v-if="station && station._id">
			<div class="left-section">
				<div class="section">
					<div class="station-info-box-wrapper">
						<station-info-box
							:station="station"
							:station-paused="stationPaused"
							:show-go-to-station="sector !== 'station'"
							:sector="'manageStation'"
							:modal-uuid="modalUuid"
						/>
					</div>
					<div
						v-if="
							hasPermission('stations.view.manage') ||
							sector !== 'home'
						"
					>
						<div class="tab-selection">
							<button
								v-if="hasPermission('stations.update')"
								class="button is-default"
								:class="{ selected: tab === 'settings' }"
								:ref="el => (tabs['settings-tab'] = el)"
								@click="showTab('settings')"
							>
								Settings
							</button>
							<button
								v-if="canRequest()"
								class="button is-default"
								:class="{ selected: tab === 'request' }"
								:ref="el => (tabs['request-tab'] = el)"
								@click="showTab('request')"
							>
								Request
							</button>
							<button
								v-if="
									hasPermission('stations.autofill') &&
									station.autofill.enabled
								"
								class="button is-default"
								:class="{ selected: tab === 'autofill' }"
								:ref="el => (tabs['autofill-tab'] = el)"
								@click="showTab('autofill')"
							>
								Autofill
							</button>
							<button
								v-if="hasPermission('stations.blacklist')"
								class="button is-default"
								:class="{ selected: tab === 'blacklist' }"
								:ref="el => (tabs['blacklist-tab'] = el)"
								@click="showTab('blacklist')"
							>
								Blacklist
							</button>
						</div>
						<settings
							v-if="hasPermission('stations.update')"
							class="tab"
							v-show="tab === 'settings'"
							:modal-uuid="modalUuid"
							ref="settingsTabComponent"
						/>
						<request
							v-if="canRequest()"
							class="tab"
							v-show="tab === 'request'"
							:sector="'manageStation'"
							:disable-auto-request="sector !== 'station'"
							:modal-uuid="modalUuid"
						/>
						<playlist-tab-base
							v-if="
								hasPermission('stations.autofill') &&
								station.autofill.enabled
							"
							class="tab"
							v-show="tab === 'autofill'"
							:type="'autofill'"
							:modal-uuid="modalUuid"
						>
							<template #info>
								<p>
									Select playlists to automatically add songs
									within to the queue
								</p>
							</template>
						</playlist-tab-base>
						<playlist-tab-base
							v-if="hasPermission('stations.blacklist')"
							class="tab"
							v-show="tab === 'blacklist'"
							:type="'blacklist'"
							:modal-uuid="modalUuid"
						>
							<template #info>
								<p>
									Blacklist a playlist to prevent all songs
									within from playing in this station
								</p>
							</template>
						</playlist-tab-base>
					</div>
				</div>
			</div>
			<div class="right-section">
				<div class="section">
					<div class="queue-title">
						<h4 class="section-title">Queue</h4>
					</div>
					<hr class="section-horizontal-rule" />
					<media-item
						v-if="currentSong.mediaSource"
						:song="currentSong"
						:requested-by="true"
						header="Currently Playing.."
						class="currently-playing"
					/>
					<queue :modal-uuid="modalUuid" sector="manageStation" />
				</div>
			</div>
		</template>
		<template #footer>
			<div class="right">
				<quick-confirm
					v-if="hasPermission('stations.queue.reset')"
					@confirm="resetQueue()"
				>
					<a class="button is-danger">Reset queue</a>
				</quick-confirm>
				<quick-confirm
					v-if="hasPermission('stations.remove')"
					@confirm="removeStation()"
				>
					<button class="button is-danger">Delete station</button>
				</quick-confirm>
			</div>
		</template>
	</modal>
</template>

<style lang="less">
.manage-station-modal.modal .modal-card {
	.tab > button {
		width: 100%;
		margin-top: 10px;
	}
	.currently-playing.song-item {
		height: 130px !important;

		.thumbnail-and-info .thumbnail {
			min-width: 130px;
			width: 130px;
		}
	}
}
</style>

<style lang="less" scoped>
.night-mode {
	.manage-station-modal.modal .modal-card-body {
		.left-section {
			.station-info-box-wrapper {
				border: 0;
			}
			.section {
				background-color: transparent !important;
			}
			.tab-selection .button {
				background: var(--dark-grey);
				color: var(--white);
			}
			.tab {
				background-color: var(--dark-grey-3);
				border: 0;
			}
		}
		.right-section .section,
		#queue {
			border-radius: @border-radius;
			background-color: transparent !important;
		}
	}
}

.manage-station-modal.modal .modal-card-body {
	display: flex;
	flex-wrap: wrap;
	height: 100%;

	.left-section {
		.station-info-box-wrapper {
			border-radius: @border-radius;
			border: 1px solid var(--light-grey-3);
			overflow: hidden;
			margin-bottom: 20px;
		}

		.tab-selection {
			display: flex;
			overflow-x: auto;

			.button {
				border-radius: @border-radius @border-radius 0 0;
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
			border: 1px solid var(--light-grey-3);
			padding: 15px 10px;
			border-radius: 0 0 @border-radius @border-radius;
		}
	}
	.right-section {
		.section {
			.queue-title {
				display: flex;
				line-height: 30px;
				.material-icons {
					margin-left: 5px;
					margin-bottom: 5px;
					font-size: 28px;
					cursor: pointer;
					&:first-of-type {
						margin-left: auto;
					}
					&.skip-station {
						color: var(--dark-red);
					}
					&.resume-station,
					&.pause-station {
						color: var(--primary-color);
					}
				}
			}
			.currently-playing {
				margin-bottom: 10px;
			}
		}
	}
	&.modal-wide .left-section .section:first-child {
		padding: 0 15px 15px !important;
	}
}
</style>
