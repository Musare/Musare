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
		properties: ["_id", "trackId", "songId"],
		sortable: false,
		hidable: false,
		resizable: false,
		minWidth:
			(hasPermission("songs.create") || hasPermission("songs.update")) &&
			hasPermission("soundcloud.removeTracks")
				? 129
				: 85,
		defaultWidth:
			(hasPermission("songs.create") || hasPermission("songs.update")) &&
			hasPermission("soundcloud.removeTracks")
				? 129
				: 85
	},
	{
		name: "thumbnailImage",
		displayName: "Thumb",
		properties: ["trackId", "artworkUrl"],
		sortable: false,
		minWidth: 75,
		defaultWidth: 75,
		maxWidth: 75,
		resizable: false
	},
	{
		name: "trackId",
		displayName: "Track ID",
		properties: ["trackId"],
		sortProperty: "trackId",
		minWidth: 120,
		defaultWidth: 120
	},
	{
		name: "_id",
		displayName: "Musare Track ID",
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
		name: "username",
		displayName: "Username",
		properties: ["username"],
		sortProperty: "username"
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
	},
	{
		name: "genre",
		displayName: "Genre",
		properties: ["genre"],
		sortProperty: "genre",
		defaultWidth: 200,
		defaultVisibility: "hidden"
	},
	{
		name: "license",
		displayName: "License",
		properties: ["license"],
		sortProperty: "license",
		defaultWidth: 200,
		defaultVisibility: "hidden"
	},
	{
		name: "likesCount",
		displayName: "Likes count",
		properties: ["likesCount"],
		sortProperty: "likesCount",
		defaultWidth: 200,
		defaultVisibility: "hidden"
	},
	{
		name: "playbackCount",
		displayName: "Playback count",
		properties: ["playbackCount"],
		sortProperty: "playbackCount",
		defaultWidth: 200,
		defaultVisibility: "hidden"
	},
	{
		name: "public",
		displayName: "Public",
		properties: ["public"],
		sortProperty: "public",
		defaultWidth: 200,
		defaultVisibility: "hidden"
	},
	{
		name: "tagList",
		displayName: "Tag list",
		properties: ["tagList"],
		sortProperty: "tagList",
		defaultWidth: 200,
		defaultVisibility: "hidden"
	},
	{
		name: "soundcloudCreatedAt",
		displayName: "Soundcloud Created At",
		properties: ["soundcloudCreatedAt"],
		sortProperty: "soundcloudCreatedAt",
		defaultWidth: 200,
		defaultVisibility: "hidden"
	}
]);
const filters = ref<TableFilter[]>([
	{
		name: "_id",
		displayName: "Musare Track ID",
		property: "_id",
		filterTypes: ["exact"],
		defaultFilterType: "exact"
	},
	{
		name: "trackId",
		displayName: "SoundCloud ID",
		property: "trackId",
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
		name: "username",
		displayName: "Username",
		property: "username",
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
	// {
	// 	name: "importJob",
	// 	displayName: "Import Job",
	// 	property: "importJob",
	// 	filterTypes: ["special"],
	// 	defaultFilterType: "special"
	// },
	{
		name: "genre",
		displayName: "Genre",
		property: "genre",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "license",
		displayName: "License",
		property: "license",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "likesCount",
		displayName: "Likes count",
		property: "likesCount",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "playbackCount",
		displayName: "Playback count",
		property: "playbackCount",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "public",
		displayName: "Public",
		property: "public",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "tagList",
		displayName: "Tag list",
		property: "tagList",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "songId",
		displayName: "Song ID",
		property: "songId",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "soundcloudCreatedAt",
		displayName: "Soundcloud Created At",
		property: "soundcloudCreatedAt",
		filterTypes: ["datetimeBefore", "datetimeAfter"],
		defaultFilterType: "datetimeBefore"
	}
]);
const events = ref<TableEvents>({
	adminRoom: "soundcloudTracks",
	updated: {
		event: "admin.soundcloudTrack.updated",
		id: "soundcloudTrack._id",
		item: "soundcloudTrack"
	},
	removed: {
		event: "admin.soundcloudTrack.removed",
		id: "trackId"
	}
});
const bulkActions = ref<TableBulkActions>({ width: 200 });
const jobs = ref([]);
if (hasPermission("media.recalculateAllRatings"))
	jobs.value.push({
		name: "Recalculate all ratings",
		socket: "media.recalculateAllRatings"
	});

const { openModal } = useModalsStore();

const rowToSong = row => ({
	mediaSource: `soundcloud:${row.trackId}`
});

const editOne = row => {
	openModal({
		modal: "editSong",
		props: { song: rowToSong(row) }
	});
};

const editMany = selectedRows => {
	if (selectedRows.length === 1) editOne(rowToSong(selectedRows[0]));
	else {
		const songs = selectedRows.map(rowToSong);
		openModal({ modal: "editSong", props: { songs } });
	}
};

const importAlbum = selectedRows => {
	const mediaSources = selectedRows.map(
		({ trackId }) => `soundcloud:${trackId}`
	);
	socket.dispatch("songs.getSongsFromMediaSources", mediaSources, res => {
		if (res.status === "success") {
			openModal({
				modal: "importAlbum",
				props: { songs: res.data.songs }
			});
		} else new Toast("Could not get songs.");
	});
};

const bulkEditPlaylist = selectedRows => {
	openModal({
		modal: "bulkEditPlaylist",
		props: {
			mediaSources: selectedRows.map(row => row.trackId)
		}
	});
};

const removeTracks = videoIds => {
	let id;
	let title;

	socket.dispatch("soundcloud.removeTracks", videoIds, {
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
</script>

<template>
	<div class="admin-tab container">
		<page-metadata title="Admin | SoundCloud | Tracks" />
		<div class="card tab-info">
			<div class="info-row">
				<h1>SoundCloud Tracks</h1>
				<p>Manage SoundCloud track cache</p>
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
			data-action="soundcloud.getTracks"
			name="admin-soundcloud-tracks"
			:max-width="1140"
			:bulk-actions="bulkActions"
		>
			<template #column-options="slotProps">
				<div class="row-options">
					<button
						class="button is-primary icon-with-button material-icons"
						@click="
							openModal({
								modal: 'viewSoundcloudTrack',
								props: {
									trackId: slotProps.item.trackId
								}
							})
						"
						:disabled="slotProps.item.removed"
						content="View Track"
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
								: 'Create song from track'
						"
						v-tippy
					>
						music_note
					</button>
					<button
						v-if="hasPermission('soundcloud.removeTracks')"
						class="button is-danger icon-with-button material-icons"
						@click.prevent="
							openModal({
								modal: 'confirm',
								props: {
									message:
										'Removing this video will remove it from all playlists and cause a ratings recalculation.',
									onCompleted: () =>
										removeTracks(slotProps.item._id)
								}
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
				<song-thumbnail
					class="song-thumbnail"
					:song="{ thumbnail: slotProps.item.artworkUrl }"
				/>
			</template>
			<template #column-trackId="slotProps">
				<span :title="slotProps.item.trackId">
					{{ slotProps.item.trackId }}
				</span>
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
			<template #column-username="slotProps">
				<span :title="slotProps.item.username">{{
					slotProps.item.username
				}}</span>
			</template>
			<template #column-duration="slotProps">
				<span :title="`${slotProps.item.duration}`">{{
					slotProps.item.duration
				}}</span>
			</template>
			<template #column-createdAt="slotProps">
				<span :title="new Date(slotProps.item.createdAt).toString()">{{
					utils.getDateFormatted(slotProps.item.createdAt)
				}}</span>
			</template>
			<template #column-songId="slotProps">
				<span :title="slotProps.item.songId">{{
					slotProps.item.songId
				}}</span>
			</template>
			<template #column-genre="slotProps">
				<span :title="slotProps.item.genre">{{
					slotProps.item.genre
				}}</span>
			</template>
			<template #column-license="slotProps">
				<span :title="slotProps.item.license">{{
					slotProps.item.license
				}}</span>
			</template>
			<template #column-likesCount="slotProps">
				<span :title="slotProps.item.likesCount">{{
					slotProps.item.likesCount
				}}</span>
			</template>
			<template #column-playbackCount="slotProps">
				<span :title="slotProps.item.playbackCount">{{
					slotProps.item.playbackCount
				}}</span>
			</template>
			<template #column-public="slotProps">
				<span :title="slotProps.item.public">{{
					slotProps.item.public
				}}</span>
			</template>
			<template #column-tagList="slotProps">
				<span :title="slotProps.item.tagList">{{
					slotProps.item.tagList
				}}</span>
			</template>
			<template #column-soundcloudCreatedAt="slotProps">
				<span
					:title="
						new Date(slotProps.item.soundcloudCreatedAt).toString()
					"
					>{{
						utils.getDateFormatted(
							slotProps.item.soundcloudCreatedAt
						)
					}}</span
				>
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
						content="Create/edit songs from tracks"
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
						content="Import album from tracks"
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
						v-if="hasPermission('soundcloud.removeTracks')"
						class="material-icons delete-icon"
						@click.prevent="
							openModal({
								modal: 'confirm',
								props: {
									message:
										'Removing these tracks will remove them from all playlists and cause a ratings recalculation.',
									onCompleted: () =>
										removeTracks(
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
