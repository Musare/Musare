<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";
import { useLongJobsStore } from "@/stores/longJobs";
import { useModalsStore } from "@/stores/modals";
import { useUserAuthStore } from "@/stores/userAuth";
import {
	TableColumn,
	TableFilter,
	TableEvents,
	TableBulkActions
} from "@/types/advancedTable";
import utils from "@/utils";

const AdvancedTable = defineAsyncComponent(
	() => import("@/components/AdvancedTable.vue")
);
const RunJobDropdown = defineAsyncComponent(
	() => import("@/components/RunJobDropdown.vue")
);
const SongThumbnail = defineAsyncComponent(
	() => import("@/components/SongThumbnail.vue")
);

const { setJob } = useLongJobsStore();

const { socket } = useWebsocketsStore();

const userAuthStore = useUserAuthStore();
const { hasPermission } = userAuthStore;

const columnDefault = ref<TableColumn>({
	sortable: true,
	hidable: true,
	defaultVisibility: "shown",
	draggable: true,
	resizable: true,
	minWidth: 200,
	maxWidth: 600
});
const columns = ref<TableColumn[]>([
	{
		name: "options",
		displayName: "Options",
		properties: ["_id", "youtubeId", "songId"],
		sortable: false,
		hidable: false,
		resizable: false,
		minWidth: 85,
		defaultWidth: 85
		// 	(hasPermission("songs.create") || hasPermission("songs.update")) &&
		// 	hasPermission("youtube.removeVideos")
		// 		? 129
		// 		: 85,
		// defaultWidth:
		// 	(hasPermission("songs.create") || hasPermission("songs.update")) &&
		// 	hasPermission("youtube.removeVideos")
		// 		? 129
		// 		: 85
	},
	// {
	// 	name: "thumbnailImage",
	// 	displayName: "Thumb",
	// 	properties: ["youtubeId"],
	// 	sortable: false,
	// 	minWidth: 75,
	// 	defaultWidth: 75,
	// 	maxWidth: 75,
	// 	resizable: false
	// },
	{
		name: "channelId",
		displayName: "Channel ID",
		properties: ["channelId"],
		sortProperty: "channelId",
		minWidth: 120,
		defaultWidth: 120
	},
	{
		name: "_id",
		displayName: "Channel OID",
		properties: ["_id"],
		sortProperty: "_id",
		minWidth: 215,
		defaultWidth: 215
	},
	{
		name: "custom_url",
		displayName: "Custom URL",
		properties: ["custom_url"],
		sortProperty: "custom_url"
	},
	{
		name: "createdAt",
		displayName: "Created At",
		properties: ["createdAt"],
		sortProperty: "createdAt",
		defaultWidth: 200,
		defaultVisibility: "hidden"
	}
]);
const filters = ref<TableFilter[]>([
	{
		name: "_id",
		displayName: "Channel OID",
		property: "_id",
		filterTypes: ["exact"],
		defaultFilterType: "exact"
	},
	{
		name: "channelId",
		displayName: "Channel ID",
		property: "channelId",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "title",
		displayName: "Title",
		property: "title",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "custom_url",
		displayName: "Custom URL",
		property: "custom_url",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "createdAt",
		displayName: "Created At",
		property: "createdAt",
		filterTypes: ["datetimeBefore", "datetimeAfter"],
		defaultFilterType: "datetimeBefore"
	}
	// {
	// 	name: "importJob",
	// 	displayName: "Import Job",
	// 	property: "importJob",
	// 	filterTypes: ["special"],
	// 	defaultFilterType: "special"
	// },
	// {
	// 	name: "songId",
	// 	displayName: "Song ID",
	// 	property: "songId",
	// 	filterTypes: ["contains", "exact", "regex"],
	// 	defaultFilterType: "contains"
	// },
	// {
	// 	name: "uploadedAt",
	// 	displayName: "Uploaded At",
	// 	property: "uploadedAt",
	// 	filterTypes: ["datetimeBefore", "datetimeAfter"],
	// 	defaultFilterType: "datetimeBefore"
	// }
]);
const events = ref<TableEvents>({
	adminRoom: "youtubeChannels",
	updated: {
		event: "admin.youtubeChannel.updated",
		id: "youtubeChannel._id",
		item: "youtubeChannel"
	},
	removed: {
		event: "admin.youtubeChannel.removed",
		id: "channelId"
	}
});
const bulkActions = ref<TableBulkActions>({ width: 200 });
const jobs = ref([]);
// if (hasPermission("media.recalculateAllRatings"))
jobs.value.push({
	name: "Get missing YouTube channels from YouTube video's",
	socket: "media.recalculateAllRatings"
});

const { openModal } = useModalsStore();

// const rowToSong = row => ({
// 	mediaSource: `youtube:${row.channelId}`
// });

// const editOne = row => {
// 	openModal({
// 		modal: "editSong",
// 		props: { song: rowToSong(row) }
// 	});
// };

// const editMany = selectedRows => {
// 	if (selectedRows.length === 1) editOne(rowToSong(selectedRows[0]));
// 	else {
// 		const songs = selectedRows.map(rowToSong);
// 		openModal({ modal: "editSong", props: { songs } });
// 	}
// };

// const importAlbum = selectedRows => {
// 	const mediaSources = selectedRows.map(
// 		({ youtubeId }) => `youtube:${youtubeId}`
// 	);
// 	console.log(77988, mediaSources);
// 	socket.dispatch("songs.getSongsFromMediaSources", mediaSources, res => {
// 		if (res.status === "success") {
// 			openModal({
// 				modal: "importAlbum",
// 				props: { songs: res.data.songs }
// 			});
// 		} else new Toast("Could not get songs.");
// 	});
// };

// const bulkEditPlaylist = selectedRows => {
// 	openModal({
// 		modal: "bulkEditPlaylist",
// 		props: {
// 			mediaSources: selectedRows.map(row => `youtube:${row.youtubeId}`)
// 		}
// 	});
// };

// const removeVideos = videoIds => {
// 	let id;
// 	let title;

// 	socket.dispatch("youtube.removeVideos", videoIds, {
// 		cb: () => {},
// 		onProgress: res => {
// 			if (res.status === "started") {
// 				id = res.id;
// 				title = res.title;
// 			}

// 			if (id)
// 				setJob({
// 					id,
// 					name: title,
// 					...res
// 				});
// 		}
// 	});
// };
</script>

<template>
	<div class="admin-tab container">
		<page-metadata title="Admin | YouTube | Channels" />
		<div class="card tab-info">
			<div class="info-row">
				<h1>YouTube Channels</h1>
				<p>Manage YouTube channel cache</p>
			</div>
			<div class="button-row">
				<run-job-dropdown :jobs="jobs" />
			</div>
		</div>
		<advanced-table
			:column-default="columnDefault"
			:columns="columns"
			:filters="filters"
			:events="events"
			data-action="youtube.getChannels"
			name="admin-youtube-channels"
			:max-width="1140"
			:bulk-actions="bulkActions"
		>
			<template #column-options="slotProps">
				<div class="row-options">
					<!-- <button
						class="button is-primary icon-with-button material-icons"
						@click="
							openModal({
								modal: 'viewYoutubeChannel',
								props: {
									channelId: slotProps.item.channelId
								}
							})
						"
						:disabled="slotProps.item.removed"
						content="View Video"
						v-tippy
					>
						open_in_full
					</button>
					<button
						v-if="
							hasPermission('songs.create') ||
							hasPermission('songs.update')
						"
						class="button is-primary icon-with-button material-icons"
						@click="editOne(slotProps.item)"
						:disabled="slotProps.item.removed"
						:content="
							!!slotProps.item.songId
								? 'Edit Song'
								: 'Create song from video'
						"
						v-tippy
					>
						music_note
					</button>
					<button
						v-if="hasPermission('youtube.removeVideos')"
						class="button is-danger icon-with-button material-icons"
						@click.prevent="
							openModal({
								modal: 'confirm',
								props: {
									message:
										'Removing this video will remove it from all playlists and cause a ratings recalculation.',
									onCompleted: () =>
										removeVideos(slotProps.item._id)
								}
							})
						"
						:disabled="slotProps.item.removed"
						content="Delete Video"
						v-tippy
					>
						delete_forever
					</button> -->
				</div>
			</template>
			<!-- <template #column-thumbnailImage="slotProps">
				<song-thumbnail class="song-thumbnail" :song="slotProps.item" />
			</template> -->
			<template #column-channelId="slotProps">
				<a
					:href="`https://www.youtube.com/${slotProps.item.channelId}`"
					target="_blank"
				>
					{{ slotProps.item.channelId }}
				</a>
			</template>
			<template #column-_id="slotProps">
				<span :title="slotProps.item._id">{{
					slotProps.item._id
				}}</span>
			</template>
			<template #column-title="slotProps">
				<span :title="slotProps.item.title">{{
					slotProps.item.title
				}}</span>
			</template>
			<template #column-createdAt="slotProps">
				<span :title="new Date(slotProps.item.createdAt).toString()">{{
					utils.getDateFormatted(slotProps.item.createdAt)
				}}</span>
			</template>
			<template #bulk-actions="slotProps">
				<div class="bulk-actions">
					<!-- <i
						v-if="
							hasPermission('songs.create') ||
							hasPermission('songs.update')
						"
						class="material-icons create-songs-icon"
						@click.prevent="editMany(slotProps.item)"
						content="Create/edit songs from videos"
						v-tippy
						tabindex="0"
					>
						music_note
					</i>
					<i
						v-if="
							hasPermission('songs.create') ||
							hasPermission('songs.update')
						"
						class="material-icons import-album-icon"
						@click.prevent="importAlbum(slotProps.item)"
						content="Import album from videos"
						v-tippy
						tabindex="0"
					>
						album
					</i>
					<i
						v-if="hasPermission('playlists.songs.add')"
						class="material-icons playlist-bulk-edit-icon"
						@click.prevent="bulkEditPlaylist(slotProps.item)"
						content="Add To Playlist"
						v-tippy
						tabindex="0"
					>
						playlist_add
					</i>
					<i
						v-if="hasPermission('youtube.removeVideos')"
						class="material-icons delete-icon"
						@click.prevent="
							openModal({
								modal: 'confirm',
								props: {
									message:
										'Removing these videos will remove them from all playlists and cause a ratings recalculation.',
									onCompleted: () =>
										removeVideos(
											slotProps.item.map(
												video => video._id
											)
										)
								}
							})
						"
						content="Delete Videos"
						v-tippy
						tabindex="0"
					>
						delete_forever
					</i> -->
				</div>
			</template>
		</advanced-table>
	</div>
</template>

<style lang="less" scoped>
// :deep(.song-thumbnail) {
// 	width: 50px;
// 	height: 50px;
// 	min-width: 50px;
// 	min-height: 50px;
// 	margin: 0 auto;
// }
</style>
