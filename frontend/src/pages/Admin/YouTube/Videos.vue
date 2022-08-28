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

const columnDefault = ref(<TableColumn>{
	sortable: true,
	hidable: true,
	defaultVisibility: "shown",
	draggable: true,
	resizable: true,
	minWidth: 200,
	maxWidth: 600
});
const columns = ref(<TableColumn[]>[
	{
		name: "options",
		displayName: "Options",
		properties: ["_id", "youtubeId", "songId"],
		sortable: false,
		hidable: false,
		resizable: false,
		minWidth:
			(hasPermission("songs.create") || hasPermission("songs.update")) &&
			hasPermission("youtube.removeVideos")
				? 129
				: 85,
		defaultWidth:
			(hasPermission("songs.create") || hasPermission("songs.update")) &&
			hasPermission("youtube.removeVideos")
				? 129
				: 85
	},
	{
		name: "thumbnailImage",
		displayName: "Thumb",
		properties: ["youtubeId"],
		sortable: false,
		minWidth: 75,
		defaultWidth: 75,
		maxWidth: 75,
		resizable: false
	},
	{
		name: "youtubeId",
		displayName: "YouTube ID",
		properties: ["youtubeId"],
		sortProperty: "youtubeId",
		minWidth: 120,
		defaultWidth: 120
	},
	{
		name: "_id",
		displayName: "Video ID",
		properties: ["_id"],
		sortProperty: "_id",
		minWidth: 215,
		defaultWidth: 215
	},
	{
		name: "title",
		displayName: "Title",
		properties: ["title"],
		sortProperty: "title"
	},
	{
		name: "author",
		displayName: "Author",
		properties: ["author"],
		sortProperty: "author"
	},
	{
		name: "duration",
		displayName: "Duration",
		properties: ["duration"],
		sortProperty: "duration",
		defaultWidth: 200
	},
	{
		name: "createdAt",
		displayName: "Created At",
		properties: ["createdAt"],
		sortProperty: "createdAt",
		defaultWidth: 200,
		defaultVisibility: "hidden"
	},
	{
		name: "songId",
		displayName: "Song ID",
		properties: ["songId"],
		sortProperty: "songId",
		defaultWidth: 220,
		defaultVisibility: "hidden"
	}
]);
const filters = ref(<TableFilter[]>[
	{
		name: "_id",
		displayName: "Video ID",
		property: "_id",
		filterTypes: ["exact"],
		defaultFilterType: "exact"
	},
	{
		name: "youtubeId",
		displayName: "YouTube ID",
		property: "youtubeId",
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
		name: "author",
		displayName: "Author",
		property: "author",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "duration",
		displayName: "Duration",
		property: "duration",
		filterTypes: [
			"numberLesserEqual",
			"numberLesser",
			"numberGreater",
			"numberGreaterEqual",
			"numberEquals"
		],
		defaultFilterType: "numberLesser"
	},
	{
		name: "createdAt",
		displayName: "Created At",
		property: "createdAt",
		filterTypes: ["datetimeBefore", "datetimeAfter"],
		defaultFilterType: "datetimeBefore"
	},
	{
		name: "importJob",
		displayName: "Import Job",
		property: "importJob",
		filterTypes: ["special"],
		defaultFilterType: "special"
	},
	{
		name: "songId",
		displayName: "Song ID",
		property: "songId",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	}
]);
const events = ref(<TableEvents>{
	adminRoom: "youtubeVideos",
	updated: {
		event: "admin.youtubeVideo.updated",
		id: "youtubeVideo._id",
		item: "youtubeVideo"
	},
	removed: {
		event: "admin.youtubeVideo.removed",
		id: "videoId"
	}
});
const bulkActions = ref(<TableBulkActions>{ width: 200 });
const jobs = ref([]);
if (hasPermission("media.recalculateAllRatings"))
	jobs.value.push({
		name: "Recalculate all ratings",
		socket: "media.recalculateAllRatings"
	});

const { openModal } = useModalsStore();

const editOne = song => {
	openModal({
		modal: "editSong",
		data: { song }
	});
};

const editMany = selectedRows => {
	if (selectedRows.length === 1) editOne(selectedRows[0]);
	else {
		const songs = selectedRows.map(row => ({
			youtubeId: row.youtubeId
		}));
		openModal({ modal: "editSong", data: { songs } });
	}
};

const importAlbum = selectedRows => {
	const youtubeIds = selectedRows.map(({ youtubeId }) => youtubeId);
	socket.dispatch("songs.getSongsFromYoutubeIds", youtubeIds, res => {
		if (res.status === "success") {
			openModal({
				modal: "importAlbum",
				data: { songs: res.data.songs }
			});
		} else new Toast("Could not get songs.");
	});
};

const removeVideos = videoIds => {
	let id;
	let title;

	socket.dispatch("youtube.removeVideos", videoIds, {
		cb: () => {},
		onProgress: res => {
			if (res.status === "started") {
				id = res.id;
				title = res.title;
			}

			if (id)
				setJob({
					id,
					name: title,
					...res
				});
		}
	});
};

const getDateFormatted = createdAt => {
	const date = new Date(createdAt);
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	const hour = `${date.getHours()}`.padStart(2, "0");
	const minute = `${date.getMinutes()}`.padStart(2, "0");
	return `${year}-${month}-${day} ${hour}:${minute}`;
};

const handleConfirmed = ({ action, params }) => {
	if (typeof action === "function") {
		if (params) action(params);
		else action();
	}
};

const confirmAction = ({ message, action, params }) => {
	openModal({
		modal: "confirm",
		data: {
			message,
			action,
			params,
			onCompleted: handleConfirmed
		}
	});
};
</script>

<template>
	<div class="admin-tab container">
		<page-metadata title="Admin | YouTube | Videos" />
		<div class="card tab-info">
			<div class="info-row">
				<h1>YouTube Videos</h1>
				<p>Manage YouTube video cache</p>
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
			data-action="youtube.getVideos"
			name="admin-youtube-videos"
			:max-width="1140"
			:bulk-actions="bulkActions"
		>
			<template #column-options="slotProps">
				<div class="row-options">
					<button
						class="button is-primary icon-with-button material-icons"
						@click="
							openModal({
								modal: 'viewYoutubeVideo',
								data: {
									videoId: slotProps.item._id
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
							confirmAction({
								message:
									'Removing this video will remove it from all playlists and cause a ratings recalculation.',
								action: removeVideos,
								params: slotProps.item._id
							})
						"
						:disabled="slotProps.item.removed"
						content="Delete Video"
						v-tippy
					>
						delete_forever
					</button>
				</div>
			</template>
			<template #column-thumbnailImage="slotProps">
				<song-thumbnail class="song-thumbnail" :song="slotProps.item" />
			</template>
			<template #column-youtubeId="slotProps">
				<a
					:href="
						'https://www.youtube.com/watch?v=' +
						`${slotProps.item.youtubeId}`
					"
					target="_blank"
				>
					{{ slotProps.item.youtubeId }}
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
			<template #column-author="slotProps">
				<span :title="slotProps.item.author">{{
					slotProps.item.author
				}}</span>
			</template>
			<template #column-duration="slotProps">
				<span :title="`${slotProps.item.duration}`">{{
					slotProps.item.duration
				}}</span>
			</template>
			<template #column-createdAt="slotProps">
				<span :title="new Date(slotProps.item.createdAt).toString()">{{
					getDateFormatted(slotProps.item.createdAt)
				}}</span>
			</template>
			<template #column-songId="slotProps">
				<span :title="slotProps.item.songId">{{
					slotProps.item.songId
				}}</span>
			</template>
			<template #bulk-actions="slotProps">
				<div class="bulk-actions">
					<i
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
						v-if="hasPermission('youtube.removeVideos')"
						class="material-icons delete-icon"
						@click.prevent="
							confirmAction({
								message:
									'Removing these videos will remove them from all playlists and cause a ratings recalculation.',
								action: removeVideos,
								params: slotProps.item.map(video => video._id)
							})
						"
						content="Delete Videos"
						v-tippy
						tabindex="0"
					>
						delete_forever
					</i>
				</div>
			</template>
		</advanced-table>
	</div>
</template>

<style lang="less" scoped>
:deep(.song-thumbnail) {
	width: 50px;
	height: 50px;
	min-width: 50px;
	min-height: 50px;
	margin: 0 auto;
}
</style>
