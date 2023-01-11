<script setup lang="ts">
import {
	defineAsyncComponent,
	ref,
	computed,
	onMounted,
	onBeforeUnmount
} from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { DraggableList } from "vue-draggable-list";
import { useWebsocketsStore } from "@/stores/websockets";
import { useEditPlaylistStore } from "@/stores/editPlaylist";
import { useStationStore } from "@/stores/station";
import { useUserAuthStore } from "@/stores/userAuth";
import { useModalsStore } from "@/stores/modals";
import utils from "@/utils";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const SongItem = defineAsyncComponent(
	() => import("@/components/SongItem.vue")
);
const Settings = defineAsyncComponent(() => import("./Tabs/Settings.vue"));
const AddSongs = defineAsyncComponent(() => import("./Tabs/AddSongs.vue"));
const ImportPlaylists = defineAsyncComponent(
	() => import("./Tabs/ImportPlaylists.vue")
);
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true },
	playlistId: { type: String, required: true }
});

const { socket } = useWebsocketsStore();
const editPlaylistStore = useEditPlaylistStore({ modalUuid: props.modalUuid });
const stationStore = useStationStore();
const userAuthStore = useUserAuthStore();

const { station } = storeToRefs(stationStore);
const { loggedIn, userId, role: userRole } = storeToRefs(userAuthStore);

const drag = ref(false);
const apiDomain = ref("");
const gettingSongs = ref(false);
const tabs = ref([]);
const songItems = ref([]);

const playlistSongs = computed({
	get: () => editPlaylistStore.playlist.songs,
	set: value => {
		editPlaylistStore.updatePlaylistSongs(value);
	}
});

const containsSpotifySongs = computed(
	() =>
		playlistSongs.value
			.map(playlistSong => playlistSong.mediaSource.split(":")[0])
			.indexOf("spotify") !== -1
);

const { tab, playlist } = storeToRefs(editPlaylistStore);
const { setPlaylist, clearPlaylist, addSong, removeSong, repositionedSong } =
	editPlaylistStore;

const { closeCurrentModal, openModal } = useModalsStore();

const showTab = payload => {
	if (tabs.value[`${payload}-tab`])
		tabs.value[`${payload}-tab`].scrollIntoView({ block: "nearest" });
	editPlaylistStore.showTab(payload);
};

const { hasPermission } = userAuthStore;

const isOwner = () =>
	loggedIn.value && userId.value === playlist.value.createdBy;

const isEditable = permission =>
	((playlist.value.type === "user" ||
		playlist.value.type === "user-liked" ||
		playlist.value.type === "user-disliked" ||
		playlist.value.type === "admin") &&
		(isOwner() || hasPermission(permission))) ||
	(playlist.value.type === "genre" &&
		permission === "playlists.update.privacy" &&
		hasPermission(permission));

const repositionSong = ({ moved }) => {
	const { oldIndex, newIndex } = moved;
	if (oldIndex === newIndex) return; // we only need to update when song is moved
	const song = playlistSongs.value[newIndex];
	socket.dispatch(
		"playlists.repositionSong",
		playlist.value._id,
		{
			...song,
			oldIndex,
			newIndex
		},
		res => {
			if (res.status !== "success")
				repositionedSong({
					...song,
					newIndex: oldIndex,
					oldIndex: newIndex
				});
		}
	);
};

const moveSongToTop = index => {
	songItems.value[`song-item-${index}`].$refs.songActions.tippy.hide();
	playlistSongs.value.splice(0, 0, playlistSongs.value.splice(index, 1)[0]);
	repositionSong({
		moved: {
			oldIndex: index,
			newIndex: 0
		}
	});
};

const moveSongToBottom = index => {
	songItems.value[`song-item-${index}`].$refs.songActions.tippy.hide();
	playlistSongs.value.splice(
		playlistSongs.value.length - 1,
		0,
		playlistSongs.value.splice(index, 1)[0]
	);
	repositionSong({
		moved: {
			oldIndex: index,
			newIndex: playlistSongs.value.length - 1
		}
	});
};

const totalLength = () => {
	let length = 0;
	playlist.value.songs.forEach(song => {
		length += song.duration;
	});
	return utils.formatTimeLong(length);
};

// const shuffle = () => {
// 	socket.dispatch("playlists.shuffle", playlist.value._id, res => {
// 		new Toast(res.message);
// 		if (res.status === "success") {
// 			updatePlaylistSongs(
// 				res.data.playlist.songs.sort((a, b) => a.position - b.position)
// 			);
// 		}
// 	});
// };

const removeSongFromPlaylist = id =>
	socket.dispatch(
		"playlists.removeSongFromPlaylist",
		id,
		playlist.value._id,
		res => {
			new Toast(res.message);
		}
	);

const removePlaylist = () => {
	if (isOwner()) {
		socket.dispatch("playlists.remove", playlist.value._id, res => {
			new Toast(res.message);
			if (res.status === "success") closeCurrentModal();
		});
	} else if (hasPermission("playlists.removeAdmin")) {
		socket.dispatch("playlists.removeAdmin", playlist.value._id, res => {
			new Toast(res.message);
			if (res.status === "success") closeCurrentModal();
		});
	}
};

const downloadPlaylist = async () => {
	if (apiDomain.value === "")
		apiDomain.value = await lofig.get("backend.apiDomain");

	fetch(`${apiDomain.value}/export/playlist/${playlist.value._id}`, {
		credentials: "include"
	})
		.then(res => res.blob())
		.then(blob => {
			const url = window.URL.createObjectURL(blob);

			const a = document.createElement("a");
			a.style.display = "none";
			a.href = url;

			a.download = `musare-playlist-${
				playlist.value._id
			}-${new Date().toISOString()}.json`;

			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);

			new Toast("Successfully downloaded playlist.");
		})
		.catch(() => new Toast("Failed to export and download playlist."));
};

const addSongToQueue = mediaSource => {
	socket.dispatch(
		"stations.addToQueue",
		station.value._id,
		mediaSource,
		"manual",
		data => {
			if (data.status !== "success")
				new Toast({
					content: `Error: ${data.message}`,
					timeout: 8000
				});
			else new Toast({ content: data.message, timeout: 4000 });
		}
	);
};

const clearAndRefillStationPlaylist = () => {
	socket.dispatch(
		"playlists.clearAndRefillStationPlaylist",
		playlist.value._id,
		data => {
			if (data.status !== "success")
				new Toast({
					content: `Error: ${data.message}`,
					timeout: 8000
				});
			else new Toast({ content: data.message, timeout: 4000 });
		}
	);
};

const clearAndRefillGenrePlaylist = () => {
	socket.dispatch(
		"playlists.clearAndRefillGenrePlaylist",
		playlist.value._id,
		data => {
			if (data.status !== "success")
				new Toast({
					content: `Error: ${data.message}`,
					timeout: 8000
				});
			else new Toast({ content: data.message, timeout: 4000 });
		}
	);
};

onMounted(() => {
	socket.onConnect(() => {
		gettingSongs.value = true;
		socket.dispatch("playlists.getPlaylist", props.playlistId, res => {
			if (res.status === "success") {
				setPlaylist(res.data.playlist);
			} else new Toast(res.message);
			gettingSongs.value = false;
		});
	});

	socket.on(
		"event:playlist.song.added",
		res => {
			if (playlist.value._id === res.data.playlistId)
				addSong(res.data.song);
		},
		{ modalUuid: props.modalUuid }
	);

	socket.on(
		"event:playlist.song.removed",
		res => {
			if (playlist.value._id === res.data.playlistId) {
				// remove song from array of playlists
				removeSong(res.data.mediaSource);
			}
		},
		{ modalUuid: props.modalUuid }
	);

	socket.on(
		"event:playlist.displayName.updated",
		res => {
			if (playlist.value._id === res.data.playlistId) {
				setPlaylist({
					displayName: res.data.displayName,
					...playlist.value
				});
			}
		},
		{ modalUuid: props.modalUuid }
	);

	socket.on(
		"event:playlist.song.repositioned",
		res => {
			if (playlist.value._id === res.data.playlistId) {
				const { song, playlistId } = res.data;

				if (playlist.value._id === playlistId) {
					repositionedSong(song);
				}
			}
		},
		{ modalUuid: props.modalUuid }
	);
});

onBeforeUnmount(() => {
	clearPlaylist();
	// Delete the Pinia store that was created for this modal, after all other cleanup tasks are performed
	editPlaylistStore.$dispose();
});
</script>

<template>
	<modal
		:title="
			isEditable('playlists.update.privacy')
				? `Edit ${playlist.type === 'admin' ? 'Admin ' : ''}Playlist`
				: `View ${playlist.type === 'admin' ? 'Admin ' : ''}Playlist`
		"
		:class="{
			'edit-playlist-modal': true,
			'view-only': !isEditable('playlists.update.privacy')
		}"
		:size="isEditable('playlists.update.privacy') ? 'wide' : null"
		:split="true"
	>
		<template #body>
			<div class="left-section">
				<div id="playlist-info-section" class="section">
					<h3>{{ playlist.displayName }}</h3>
					<h5>Song Count: {{ playlist.songs.length }}</h5>
					<h5>Duration: {{ totalLength() }}</h5>
				</div>

				<div class="tabs-container">
					<div class="tab-selection">
						<button
							class="button is-default"
							:class="{ selected: tab === 'settings' }"
							:ref="el => (tabs['settings-tab'] = el)"
							@click="showTab('settings')"
							v-if="isEditable('playlists.update.privacy')"
						>
							Settings
						</button>
						<button
							class="button is-default"
							:class="{ selected: tab === 'add-songs' }"
							:ref="el => (tabs['add-songs-tab'] = el)"
							@click="showTab('add-songs')"
							v-if="isEditable('playlists.songs.add')"
						>
							Add Songs
						</button>
						<button
							class="button is-default"
							:class="{
								selected: tab === 'import-playlists'
							}"
							:ref="el => (tabs['import-playlists-tab'] = el)"
							@click="showTab('import-playlists')"
							v-if="isEditable('playlists.songs.add')"
						>
							Import Songs
						</button>
					</div>
					<settings
						class="tab"
						v-show="tab === 'settings'"
						v-if="isEditable('playlists.update.privacy')"
						:modal-uuid="modalUuid"
					/>
					<add-songs
						class="tab"
						v-show="tab === 'add-songs'"
						v-if="isEditable('playlists.songs.add')"
						:modal-uuid="modalUuid"
					/>
					<import-playlists
						class="tab"
						v-show="tab === 'import-playlists'"
						v-if="isEditable('playlists.songs.add')"
						:modal-uuid="modalUuid"
					/>
				</div>
			</div>

			<div class="right-section">
				<div id="rearrange-songs-section" class="section">
					<div v-if="isEditable('playlists.songs.reposition')">
						<h4 class="section-title">Rearrange Songs</h4>

						<p class="section-description">
							Drag and drop songs to change their order
						</p>

						<hr class="section-horizontal-rule" />
					</div>

					<aside class="menu">
						<draggable-list
							v-if="playlistSongs.length > 0"
							v-model:list="playlistSongs"
							item-key="mediaSource"
							@start="drag = true"
							@end="drag = false"
							@update="repositionSong"
							:disabled="
								!isEditable('playlists.songs.reposition')
							"
						>
							<template #item="{ element, index }">
								<song-item
									:song="element"
									:ref="
										el =>
											(songItems[`song-item-${index}`] =
												el)
									"
									:key="`playlist-song-${element.mediaSource}`"
								>
									<template #tippyActions>
										<i
											class="material-icons add-to-queue-icon"
											v-if="
												station &&
												station.requests &&
												station.requests.enabled &&
												(station.requests.access ===
													'user' ||
													(station.requests.access ===
														'owner' &&
														(userRole === 'admin' ||
															station.owner ===
																userId)))
											"
											@click="
												addSongToQueue(
													element.mediaSource
												)
											"
											content="Add Song to Queue"
											v-tippy
											>queue</i
										>
										<quick-confirm
											v-if="
												userId === playlist.createdBy ||
												isEditable(
													'playlists.songs.reposition'
												)
											"
											placement="left"
											@confirm="
												removeSongFromPlaylist(
													element.mediaSource
												)
											"
										>
											<i
												class="material-icons delete-icon"
												content="Remove Song from Playlist"
												v-tippy
												>delete_forever</i
											>
										</quick-confirm>
										<i
											class="material-icons"
											v-if="
												isEditable(
													'playlists.songs.reposition'
												) && index > 0
											"
											@click="moveSongToTop(index)"
											content="Move to top of Playlist"
											v-tippy
											>vertical_align_top</i
										>
										<i
											v-if="
												isEditable(
													'playlists.songs.reposition'
												) &&
												playlistSongs.length - 1 !==
													index
											"
											@click="moveSongToBottom(index)"
											class="material-icons"
											content="Move to bottom of Playlist"
											v-tippy
											>vertical_align_bottom</i
										>
									</template>
								</song-item>
							</template>
						</draggable-list>
						<p v-else-if="gettingSongs" class="nothing-here-text">
							Loading songs...
						</p>
						<p v-else class="nothing-here-text">
							This playlist doesn't have any songs.
						</p>
					</aside>
				</div>
			</div>
		</template>
		<template #footer>
			<button
				class="button is-default"
				v-if="
					isOwner() ||
					hasPermission('playlists.get') ||
					playlist.privacy === 'public'
				"
				@click="downloadPlaylist()"
			>
				Download Playlist
			</button>
			<button
				class="button is-default"
				v-if="isOwner() && containsSpotifySongs"
				@click="
					openModal({
						modal: 'convertSpotifySongs',
						props: { playlistId: playlist._id }
					})
				"
			>
				Convert Spotify Songs
			</button>
			<div class="right">
				<quick-confirm
					v-if="
						hasPermission('playlists.clearAndRefill') &&
						playlist.type === 'station'
					"
					@confirm="clearAndRefillStationPlaylist()"
				>
					<a class="button is-danger">
						Clear and refill station playlist
					</a>
				</quick-confirm>
				<quick-confirm
					v-if="
						hasPermission('playlists.clearAndRefill') &&
						playlist.type === 'genre'
					"
					@confirm="clearAndRefillGenrePlaylist()"
				>
					<a class="button is-danger">
						Clear and refill genre playlist
					</a>
				</quick-confirm>
				<quick-confirm
					v-if="
						isEditable('playlists.removeAdmin') &&
						!(
							playlist.type === 'user-liked' ||
							playlist.type === 'user-disliked'
						)
					"
					@confirm="removePlaylist()"
				>
					<a class="button is-danger"> Remove Playlist </a>
				</quick-confirm>
			</div>
		</template>
	</modal>
</template>

<style lang="less" scoped>
.night-mode {
	.label,
	p,
	strong {
		color: var(--light-grey-2);
	}

	.edit-playlist-modal.modal .modal-card-body {
		.left-section {
			#playlist-info-section {
				background-color: var(--dark-grey-3) !important;
				border: 0;
			}
			.tabs-container {
				background-color: transparent !important;
				.tab-selection .button {
					background: var(--dark-grey);
					color: var(--white);
				}
				.tab {
					background-color: var(--dark-grey-3) !important;
					border: 0 !important;
				}
			}
		}
		.right-section .section {
			border-radius: @border-radius;
		}
	}
}

.controls {
	display: flex;

	a {
		display: flex;
		align-items: center;
	}
}

.tabs-container {
	.tab-selection {
		display: flex;
		margin: 24px 10px 0 10px;
		max-width: 100%;

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
		border-radius: 0 0 @border-radius @border-radius;
	}
}

.edit-playlist-modal {
	&.view-only {
		height: auto !important;

		.left-section {
			flex-basis: 100% !important;
		}

		.right-section {
			max-height: unset !important;
		}

		:deep(.section) {
			max-width: 100% !important;
		}
	}

	.nothing-here-text {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.label {
		font-size: 1rem;
		font-weight: normal;
	}

	.input-with-button .button {
		width: 150px;
	}

	.left-section {
		#playlist-info-section {
			border: 1px solid var(--light-grey-3);
			border-radius: @border-radius;
			padding: 15px !important;

			h3 {
				font-weight: 600;
				font-size: 30px;
			}

			h5 {
				font-size: 18px;
			}

			h3,
			h5 {
				margin: 0;
			}
		}
	}
}
</style>
