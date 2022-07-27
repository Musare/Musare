<script setup lang="ts">
import { useStore } from "vuex";
import {
	defineAsyncComponent,
	ref,
	computed,
	onBeforeMount,
	onMounted,
	onBeforeUnmount,
	onUnmounted
} from "vue";
import Toast from "toasters";
import { useModalState, useModalActions } from "@/vuex_helpers";
import editSongStore from "@/store/modules/modals/editSong";
import { useWebsocketsStore } from "@/stores/websockets";

const EditSongModal = defineAsyncComponent(
	() => import("@/components/modals/EditSong/index.vue")
);
const SongItem = defineAsyncComponent(
	() => import("@/components/SongItem.vue")
);

const props = defineProps({
	modalUuid: { type: String, default: "" }
});

const store = useStore();

const { socket } = useWebsocketsStore();

const { youtubeIds, songPrefillData } = useModalState(
	"modals/editSongs/MODAL_UUID",
	{
		modalUuid: props.modalUuid
	}
);

const { editSong } = useModalActions(
	"modals/editSongs/MODAL_UUID/editSong",
	["editSong"],
	{
		modalUuid: props.modalUuid
	}
);

const openModal = payload =>
	store.dispatch("modalVisibility/openModal", payload);
const closeCurrentModal = () =>
	store.dispatch("modalVisibility/closeCurrentModal");

const items = ref([]);
const currentSong = ref({});
const flagFilter = ref(false);
const sidebarMobileActive = ref(false);
const songItems = ref([]);

const editingItemIndex = computed(() =>
	items.value.findIndex(
		item => item.song.youtubeId === currentSong.value.youtubeId
	)
);
const filteredItems = computed({
	get: () =>
		items.value.filter(item => (flagFilter.value ? item.flagged : true)),
	set: newItem => {
		const index = items.value.findIndex(
			item => item.song.youtubeId === newItem.youtubeId
		);
		items.value[index] = newItem;
	}
});
const filteredEditingItemIndex = computed(() =>
	filteredItems.value.findIndex(
		item => item.song.youtubeId === currentSong.value.youtubeId
	)
);
const currentSongFlagged = computed(
	() =>
		items.value.find(
			item => item.song.youtubeId === currentSong.value.youtubeId
		)?.flagged
);

const pickSong = song => {
	editSong({
		youtubeId: song.youtubeId,
		prefill: songPrefillData[song.youtubeId]
	});
	currentSong.value = song;
	if (
		songItems.value[`edit-songs-item-${song.youtubeId}`] &&
		songItems.value[`edit-songs-item-${song.youtubeId}`][0]
	)
		songItems.value[
			`edit-songs-item-${song.youtubeId}`
		][0].scrollIntoView();
};

const editNextSong = () => {
	const currentlyEditingSongIndex = filteredEditingItemIndex.value;
	let newEditingSongIndex = -1;
	const index =
		currentlyEditingSongIndex + 1 === filteredItems.value.length
			? 0
			: currentlyEditingSongIndex + 1;
	for (let i = index; i < filteredItems.value.length; i += 1) {
		if (!flagFilter.value || filteredItems.value[i].flagged) {
			newEditingSongIndex = i;
			break;
		}
	}

	if (newEditingSongIndex > -1) {
		const nextSong = filteredItems.value[newEditingSongIndex].song;
		if (nextSong.removed) editNextSong();
		else pickSong(nextSong);
	}
};

const toggleFlag = (songIndex = null) => {
	if (songIndex && songIndex > -1) {
		filteredItems.value[songIndex].flagged =
			!filteredItems.value[songIndex].flagged;
		new Toast(
			`Successfully ${
				filteredItems.value[songIndex].flagged ? "flagged" : "unflagged"
			} song.`
		);
	} else if (!songIndex && editingItemIndex.value > -1) {
		items.value[editingItemIndex.value].flagged =
			!items.value[editingItemIndex.value].flagged;
		new Toast(
			`Successfully ${
				items.value[editingItemIndex.value].flagged
					? "flagged"
					: "unflagged"
			} song.`
		);
	}
};

const onSavedSuccess = youtubeId => {
	const itemIndex = items.value.findIndex(
		item => item.song.youtubeId === youtubeId
	);
	if (itemIndex > -1) {
		items.value[itemIndex].status = "done";
		items.value[itemIndex].flagged = false;
	}
};

const onSavedError = youtubeId => {
	const itemIndex = items.value.findIndex(
		item => item.song.youtubeId === youtubeId
	);
	if (itemIndex > -1) items.value[itemIndex].status = "error";
};

const onSaving = youtubeId => {
	const itemIndex = items.value.findIndex(
		item => item.song.youtubeId === youtubeId
	);
	if (itemIndex > -1) items.value[itemIndex].status = "saving";
};

const toggleDone = (index, overwrite = null) => {
	const { status } = filteredItems.value[index];

	if (status === "done" && overwrite !== "done")
		filteredItems.value[index].status = "todo";
	else {
		filteredItems.value[index].status = "done";
		filteredItems.value[index].flagged = false;
	}
};

const toggleFlagFilter = () => {
	flagFilter.value = !flagFilter.value;
};

const toggleMobileSidebar = () => {
	sidebarMobileActive.value = !sidebarMobileActive.value;
};

const onClose = () => {
	const doneItems = items.value.filter(item => item.status === "done").length;
	const flaggedItems = items.value.filter(item => item.flagged).length;
	const notDoneItems = items.value.length - doneItems;

	if (doneItems > 0 && notDoneItems > 0)
		openModal({
			modal: "confirm",
			data: {
				message:
					"You have songs which are not done yet. Are you sure you want to stop editing songs?",
				onCompleted: closeCurrentModal
			}
		});
	else if (flaggedItems > 0)
		openModal({
			modal: "confirm",
			data: {
				message:
					"You have songs which are flagged. Are you sure you want to stop editing songs?",
				onCompleted: closeCurrentModal
			}
		});
	else closeCurrentModal();
};

onBeforeMount(() => {
	console.log("EDITSONGS BEFOREMOUNT");
	store.registerModule(
		["modals", "editSongs", props.modalUuid, "editSong"],
		editSongStore
	);
});

onMounted(async () => {
	console.log("EDITSONGS MOUNTED");

	socket.dispatch("apis.joinRoom", "edit-songs");

	socket.dispatch("songs.getSongsFromYoutubeIds", youtubeIds, res => {
		if (res.data.songs.length === 0) {
			closeCurrentModal();
			new Toast("You can't edit 0 songs.");
		} else {
			items.value = res.data.songs.map(song => ({
				status: "todo",
				flagged: false,
				song
			}));
			editNextSong();
		}
	});

	socket.on(
		`event:admin.song.created`,
		res => {
			const index = items.value
				.map(item => item.song.youtubeId)
				.indexOf(res.data.song.youtubeId);
			if (index >= 0)
				items.value[index].song = {
					...items.value[index].song,
					...res.data.song,
					created: true
				};
		},
		{ modalUuid: props.modalUuid }
	);

	socket.on(
		`event:admin.song.updated`,
		res => {
			const index = items.value
				.map(item => item.song.youtubeId)
				.indexOf(res.data.song.youtubeId);
			if (index >= 0)
				items.value[index].song = {
					...items.value[index].song,
					...res.data.song,
					updated: true
				};
		},
		{ modalUuid: props.modalUuid }
	);

	socket.on(
		`event:admin.song.removed`,
		res => {
			const index = items.value
				.map(item => item.song._id)
				.indexOf(res.data.songId);
			if (index >= 0) items.value[index].song.removed = true;
		},
		{ modalUuid: props.modalUuid }
	);

	socket.on(
		`event:admin.youtubeVideo.removed`,
		res => {
			const index = items.value
				.map(item => item.song.youtubeVideoId)
				.indexOf(res.videoId);
			if (index >= 0) items.value[index].song.removed = true;
		},
		{ modalUuid: props.modalUuid }
	);
});

onBeforeUnmount(() => {
	console.log("EDITSONGS BEFORE UNMOUNT");
	socket.dispatch("apis.leaveRoom", "edit-songs");
});

onUnmounted(() => {
	console.log("EDITSONGS UNMOUNTED");
	// Delete the VueX module that was created for this modal, after all other cleanup tasks are performed
	store.unregisterModule(["modals", "editSongs", props.modalUuid]);
});
</script>

<template>
	<div>
		<edit-song-modal
			:modal-module-path="`modals/editSongs/${modalUuid}/editSong`"
			:modal-uuid="modalUuid"
			:bulk="true"
			:flagged="currentSongFlagged"
			v-if="currentSong"
			@savedSuccess="onSavedSuccess"
			@savedError="onSavedError"
			@saving="onSaving"
			@toggleFlag="toggleFlag"
			@nextSong="editNextSong"
			@close="onClose"
		>
			<template #toggleMobileSidebar>
				<i
					class="material-icons toggle-sidebar-icon"
					:content="`${
						sidebarMobileActive ? 'Close' : 'Open'
					} Edit Queue`"
					v-tippy
					@click="toggleMobileSidebar()"
					>expand_circle_down</i
				>
			</template>
			<template #sidebar>
				<div class="sidebar" :class="{ active: sidebarMobileActive }">
					<header class="sidebar-head">
						<h2 class="sidebar-title is-marginless">Edit Queue</h2>
						<i
							class="material-icons toggle-sidebar-icon"
							:content="`${
								sidebarMobileActive ? 'Close' : 'Open'
							} Edit Queue`"
							v-tippy
							@click="toggleMobileSidebar()"
							>expand_circle_down</i
						>
					</header>
					<section class="sidebar-body">
						<div
							v-show="filteredItems.length > 0"
							class="edit-songs-items"
						>
							<div
								class="item"
								v-for="(
									{ status, flagged, song }, index
								) in filteredItems"
								:key="`edit-songs-item-${index}`"
								:ref="
									el =>
										(songItems[
											`edit-songs-item-${song.youtubeId}`
										] = el)
								"
							>
								<song-item
									:song="song"
									:thumbnail="false"
									:duration="false"
									:disabled-actions="
										song.removed
											? ['all']
											: ['report', 'edit']
									"
									:class="{
										updated: song.updated,
										removed: song.removed
									}"
								>
									<template #leftIcon>
										<i
											v-if="
												currentSong.youtubeId ===
													song.youtubeId &&
												!song.removed
											"
											class="material-icons item-icon editing-icon"
											content="Currently editing song"
											v-tippy="{ theme: 'info' }"
											@click="toggleDone(index)"
											>edit</i
										>
										<i
											v-else-if="song.removed"
											class="material-icons item-icon removed-icon"
											content="Song removed"
											v-tippy="{ theme: 'info' }"
											>delete_forever</i
										>
										<i
											v-else-if="status === 'error'"
											class="material-icons item-icon error-icon"
											content="Error saving song"
											v-tippy="{ theme: 'info' }"
											@click="toggleDone(index)"
											>error</i
										>
										<i
											v-else-if="status === 'saving'"
											class="material-icons item-icon saving-icon"
											content="Currently saving song"
											v-tippy="{ theme: 'info' }"
											>pending</i
										>
										<i
											v-else-if="flagged"
											class="material-icons item-icon flag-icon"
											content="Song flagged"
											v-tippy="{ theme: 'info' }"
											@click="toggleDone(index)"
											>flag_circle</i
										>
										<i
											v-else-if="status === 'done'"
											class="material-icons item-icon done-icon"
											content="Song marked complete"
											v-tippy="{ theme: 'info' }"
											@click="toggleDone(index)"
											>check_circle</i
										>
										<i
											v-else-if="status === 'todo'"
											class="material-icons item-icon todo-icon"
											content="Song marked todo"
											v-tippy="{ theme: 'info' }"
											@click="toggleDone(index)"
											>cancel</i
										>
									</template>
									<template v-if="!song.removed" #actions>
										<i
											class="material-icons edit-icon"
											content="Edit Song"
											v-tippy
											@click="pickSong(song)"
										>
											edit
										</i>
									</template>
									<template #tippyActions>
										<i
											class="material-icons flag-icon"
											:class="{ flagged }"
											content="Toggle Flag"
											v-tippy
											@click="toggleFlag(index)"
										>
											flag_circle
										</i>
									</template>
								</song-item>
							</div>
						</div>
						<p v-if="filteredItems.length === 0" class="no-items">
							{{
								flagFilter
									? "No flagged songs queued"
									: "No songs queued"
							}}
						</p>
					</section>
					<footer class="sidebar-foot">
						<button
							@click="toggleFlagFilter()"
							class="button is-primary"
						>
							{{
								flagFilter
									? "Show All Songs"
									: "Show Only Flagged Songs"
							}}
						</button>
					</footer>
				</div>
				<div
					v-if="sidebarMobileActive"
					class="sidebar-overlay"
					@click="toggleMobileSidebar()"
				></div>
			</template>
		</edit-song-modal>
	</div>
</template>

<style lang="less" scoped>
.night-mode .sidebar {
	.sidebar-head,
	.sidebar-foot {
		background-color: var(--dark-grey-3);
		border: none;
	}

	.sidebar-body {
		background-color: var(--dark-grey-4) !important;
	}

	.sidebar-head .toggle-sidebar-icon.material-icons,
	.sidebar-title {
		color: var(--white);
	}

	p,
	label,
	td,
	th {
		color: var(--light-grey-2) !important;
	}

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		color: var(--white) !important;
	}
}

.toggle-sidebar-icon {
	display: none;
}

.sidebar {
	width: 100%;
	max-width: 350px;
	z-index: 2000;
	display: flex;
	flex-direction: column;
	position: relative;
	height: 100%;
	max-height: calc(100vh - 40px);
	overflow: auto;
	margin-right: 8px;
	border-radius: @border-radius;

	.sidebar-head,
	.sidebar-foot {
		display: flex;
		flex-shrink: 0;
		position: relative;
		justify-content: flex-start;
		align-items: center;
		padding: 20px;
		background-color: var(--light-grey);
	}

	.sidebar-head {
		border-bottom: 1px solid var(--light-grey-2);
		border-radius: @border-radius @border-radius 0 0;

		.sidebar-title {
			display: flex;
			flex: 1;
			margin: 0;
			font-size: 26px;
			font-weight: 600;
		}
	}

	.sidebar-body {
		background-color: var(--white);
		display: flex;
		flex-direction: column;
		row-gap: 8px;
		flex: 1;
		overflow: auto;
		padding: 10px;

		.edit-songs-items {
			display: flex;
			flex-direction: column;
			row-gap: 8px;

			.item {
				display: flex;
				flex-direction: row;
				align-items: center;
				column-gap: 8px;

				:deep(.song-item) {
					.item-icon {
						margin-right: 10px;
						cursor: pointer;
					}

					.removed-icon,
					.error-icon {
						color: var(--red);
					}

					.saving-icon,
					.todo-icon,
					.editing-icon {
						color: var(--primary-color);
					}

					.done-icon {
						color: var(--green);
					}

					.flag-icon {
						color: var(--orange);

						&.flagged {
							color: var(--grey);
						}
					}

					&.removed {
						filter: grayscale(100%);
						cursor: not-allowed;
						user-select: none;
					}
				}
			}
		}

		.no-items {
			text-align: center;
			font-size: 18px;
		}
	}

	.sidebar-foot {
		border-top: 1px solid var(--light-grey-2);
		border-radius: 0 0 @border-radius @border-radius;

		.button {
			flex: 1;
		}
	}

	.sidebar-overlay {
		display: none;
	}
}

@media only screen and (max-width: 1580px) {
	.toggle-sidebar-icon {
		display: flex;
		margin-right: 5px;
		transform: rotate(90deg);
		cursor: pointer;
	}

	.sidebar {
		display: none;

		&.active {
			display: flex;
			position: absolute;
			z-index: 2010;
			top: 20px;
			left: 20px;

			.sidebar-head .toggle-sidebar-icon {
				display: flex;
				margin-left: 5px;
				transform: rotate(-90deg);
			}
		}
	}

	.sidebar-overlay {
		display: flex;
		position: absolute;
		z-index: 2009;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(10, 10, 10, 0.85);
	}
}
</style>
