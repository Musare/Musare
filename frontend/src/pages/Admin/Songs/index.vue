<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useWebsocketsStore } from "@/stores/websockets";
import { useConfigStore } from "@/stores/config";
import { useLongJobsStore } from "@/stores/longJobs";
import { useModalsStore } from "@/stores/modals";
import { useUserAuthStore } from "@/stores/userAuth";
import { TableColumn, TableFilter, TableEvents } from "@/types/advancedTable";
import utils from "@/utils";

const AdvancedTable = defineAsyncComponent(
	() => import("@/components/AdvancedTable.vue")
);
const RunJobDropdown = defineAsyncComponent(
	() => import("@/components/RunJobDropdown.vue")
);
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);
const SongThumbnail = defineAsyncComponent(
	() => import("@/components/SongThumbnail.vue")
);
const UserLink = defineAsyncComponent(
	() => import("@/components/UserLink.vue")
);

const route = useRoute();

const { setJob } = useLongJobsStore();

const { socket } = useWebsocketsStore();

const configStore = useConfigStore();
const { experimental } = storeToRefs(configStore);

const { hasPermission } = useUserAuthStore();

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
		properties: ["_id", "verified", "mediaSource"],
		sortable: false,
		hidable: false,
		resizable: false,
		minWidth:
			hasPermission("songs.verify") &&
			hasPermission("songs.update") &&
			hasPermission("songs.remove")
				? 129
				: 85,
		defaultWidth:
			hasPermission("songs.verify") &&
			hasPermission("songs.update") &&
			hasPermission("songs.remove")
				? 129
				: 85
	},
	{
		name: "thumbnailImage",
		displayName: "Thumb",
		properties: ["thumbnail"],
		sortable: false,
		minWidth: 75,
		defaultWidth: 75,
		maxWidth: 75,
		resizable: false
	},
	{
		name: "title",
		displayName: "Title",
		properties: ["title"],
		sortProperty: "title"
	},
	{
		name: "artists",
		displayName: "Artists",
		properties: ["artists"],
		sortable: false
	},
	{
		name: "genres",
		displayName: "Genres",
		properties: ["genres"],
		sortable: false
	},
	{
		name: "tags",
		displayName: "Tags",
		properties: ["tags"],
		sortable: false
	},
	{
		name: "_id",
		displayName: "Song ID",
		properties: ["_id"],
		sortProperty: "_id",
		minWidth: 215,
		defaultWidth: 215
	},
	{
		name: "mediaSource",
		displayName: "Media source",
		properties: ["mediaSource"],
		sortProperty: "mediaSource",
		minWidth: 120,
		defaultWidth: 120
	},
	{
		name: "verified",
		displayName: "Verified",
		properties: ["verified"],
		sortProperty: "verified",
		minWidth: 120,
		defaultWidth: 120
	},
	{
		name: "thumbnailUrl",
		displayName: "Thumbnail (URL)",
		properties: ["thumbnail"],
		sortProperty: "thumbnail",
		defaultVisibility: "hidden"
	},
	{
		name: "duration",
		displayName: "Duration",
		properties: ["duration"],
		sortProperty: "duration",
		defaultWidth: 200,
		defaultVisibility: "hidden"
	},
	{
		name: "skipDuration",
		displayName: "Skip Duration",
		properties: ["skipDuration"],
		sortProperty: "skipDuration",
		defaultWidth: 200,
		defaultVisibility: "hidden"
	},
	{
		name: "requestedBy",
		displayName: "Requested By",
		properties: ["requestedBy"],
		sortProperty: "requestedBy",
		defaultWidth: 200,
		defaultVisibility: "hidden"
	},
	{
		name: "requestedAt",
		displayName: "Requested At",
		properties: ["requestedAt"],
		sortProperty: "requestedAt",
		defaultWidth: 200,
		defaultVisibility: "hidden"
	},
	{
		name: "verifiedBy",
		displayName: "Verified By",
		properties: ["verifiedBy"],
		sortProperty: "verifiedBy",
		defaultWidth: 200,
		defaultVisibility: "hidden"
	},
	{
		name: "verifiedAt",
		displayName: "Verified At",
		properties: ["verifiedAt"],
		sortProperty: "verifiedAt",
		defaultWidth: 200,
		defaultVisibility: "hidden"
	}
]);
const filters = ref<TableFilter[]>([
	{
		name: "_id",
		displayName: "Song ID",
		property: "_id",
		filterTypes: ["exact"],
		defaultFilterType: "exact"
	},
	{
		name: "mediaSource",
		displayName: "Media source",
		property: "mediaSource",
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
		name: "artists",
		displayName: "Artists",
		property: "artists",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains",
		autosuggest: true,
		autosuggestDataAction: "songs.getArtists"
	},
	{
		name: "genres",
		displayName: "Genres",
		property: "genres",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains",
		autosuggest: true,
		autosuggestDataAction: "songs.getGenres"
	},
	{
		name: "tags",
		displayName: "Tags",
		property: "tags",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains",
		autosuggest: true,
		autosuggestDataAction: "songs.getTags"
	},
	{
		name: "thumbnail",
		displayName: "Thumbnail",
		property: "thumbnail",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "requestedBy",
		displayName: "Requested By",
		property: "requestedBy",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "requestedAt",
		displayName: "Requested At",
		property: "requestedAt",
		filterTypes: ["datetimeBefore", "datetimeAfter"],
		defaultFilterType: "datetimeBefore"
	},
	{
		name: "verifiedBy",
		displayName: "Verified By",
		property: "verifiedBy",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "verifiedAt",
		displayName: "Verified At",
		property: "verifiedAt",
		filterTypes: ["datetimeBefore", "datetimeAfter"],
		defaultFilterType: "datetimeBefore"
	},
	{
		name: "verified",
		displayName: "Verified",
		property: "verified",
		filterTypes: ["boolean"],
		defaultFilterType: "boolean"
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
		name: "skipDuration",
		displayName: "Skip Duration",
		property: "skipDuration",
		filterTypes: [
			"numberLesserEqual",
			"numberLesser",
			"numberGreater",
			"numberGreaterEqual",
			"numberEquals"
		],
		defaultFilterType: "numberLesser"
	}
]);
const events = ref<TableEvents>({
	adminRoom: "songs",
	updated: {
		event: "admin.song.updated",
		id: "song._id",
		item: "song"
	},
	removed: {
		event: "admin.song.removed",
		id: "songId"
	}
});
const jobs = ref([]);
if (hasPermission("songs.updateAll"))
	jobs.value.push({
		name: "Update all songs",
		socket: "songs.updateAll"
	});
if (hasPermission("media.recalculateAllRatings"))
	jobs.value.push({
		name: "Recalculate all ratings",
		socket: "media.recalculateAllRatings"
	});

const { openModal } = useModalsStore();

const create = () => {
	openModal({
		modal: "editSong",
		props: { song: { newSong: true } }
	});
};

const editOne = song => {
	openModal({
		modal: "editSong",
		props: { song }
	});
};

const editMany = selectedRows => {
	if (selectedRows.length === 1) editOne(selectedRows[0]);
	else {
		const songs = selectedRows.map(row => ({
			mediaSource: row.mediaSource
		}));
		openModal({ modal: "editSong", props: { songs } });
	}
};

const verifyOne = songId => {
	socket.dispatch("songs.verify", songId, res => {
		new Toast(res.message);
	});
};

const verifyMany = selectedRows => {
	let id;
	let title;

	socket.dispatch(
		"songs.verifyMany",
		selectedRows.map(row => row._id),
		{
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
		}
	);
};

const unverifyOne = songId => {
	socket.dispatch("songs.unverify", songId, res => {
		new Toast(res.message);
	});
};

const unverifyMany = selectedRows => {
	let id;
	let title;

	socket.dispatch(
		"songs.unverifyMany",
		selectedRows.map(row => row._id),
		{
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
		}
	);
};

const importAlbum = selectedRows => {
	const mediaSources = selectedRows.map(({ mediaSource }) => mediaSource);
	socket.dispatch("songs.getSongsFromMediaSources", mediaSources, res => {
		if (res.status === "success") {
			openModal({
				modal: "importAlbum",
				props: { songs: res.data.songs }
			});
		} else new Toast("Could not get media.");
	});
};

const setTags = selectedRows => {
	openModal({
		modal: "bulkActions",
		props: {
			type: {
				name: "tags",
				action: "songs.editTags",
				items: selectedRows.map(row => row._id),
				regex: /^[a-zA-Z0-9_]{1,64}$|^[a-zA-Z0-9_]{1,64}\[[a-zA-Z0-9_]{1,64}\]$/,
				autosuggest: true,
				autosuggestDataAction: "songs.getTags"
			}
		}
	});
};

const setArtists = selectedRows => {
	openModal({
		modal: "bulkActions",
		props: {
			type: {
				name: "artists",
				action: "songs.editArtists",
				items: selectedRows.map(row => row._id),
				regex: /^(?=.{1,64}$).*$/,
				autosuggest: true,
				autosuggestDataAction: "songs.getArtists"
			}
		}
	});
};

const setGenres = selectedRows => {
	openModal({
		modal: "bulkActions",
		props: {
			type: {
				name: "genres",
				action: "songs.editGenres",
				items: selectedRows.map(row => row._id),
				regex: /^[\x00-\x7F]{1,32}$/,
				autosuggest: true,
				autosuggestDataAction: "songs.getGenres"
			}
		}
	});
};

const bulkEditPlaylist = selectedRows => {
	openModal({
		modal: "bulkEditPlaylist",
		props: {
			youtubeIds: selectedRows.map(row => row.mediaSource)
		}
	});
};

const deleteOne = songId => {
	socket.dispatch("songs.remove", songId, res => {
		new Toast(res.message);
	});
};

const deleteMany = selectedRows => {
	let id;
	let title;

	socket.dispatch(
		"songs.removeMany",
		selectedRows.map(row => row._id),
		{
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
		}
	);
};

onMounted(() => {
	if (route.query.songId) {
		socket.dispatch("songs.getSongFromSongId", route.query.songId, res => {
			if (res.status === "success") editMany([res.data.song]);
			else new Toast("Song with that ID not found");
		});
	}
});
</script>

<template>
	<div class="admin-tab">
		<page-metadata title="Admin | Songs" />
		<div class="card tab-info">
			<div class="info-row">
				<h1>Songs</h1>
				<p>Create, edit and manage songs in the catalogue</p>
			</div>
			<div class="button-row">
				<button
					v-if="hasPermission('songs.create')"
					class="button is-primary"
					@click="create()"
				>
					Create song
				</button>
				<button
					v-if="
						(hasPermission('songs.create') ||
							hasPermission('songs.update')) &&
						hasPermission('apis.searchDiscogs')
					"
					class="button is-primary"
					@click="openModal('importAlbum')"
				>
					Import album
				</button>
				<button
					v-if="
						experimental.spotify &&
						(hasPermission('songs.create') ||
							hasPermission('songs.update'))
					"
					class="button is-primary"
					@click="openModal('importArtist')"
				>
					Import artist
				</button>
				<run-job-dropdown :jobs="jobs" />
			</div>
		</div>
		<advanced-table
			:column-default="columnDefault"
			:columns="columns"
			:filters="filters"
			data-action="songs.getData"
			name="admin-songs"
			:events="events"
		>
			<template #column-options="slotProps">
				<div class="row-options">
					<button
						v-if="hasPermission('songs.update')"
						class="button is-primary icon-with-button material-icons"
						@click="editOne(slotProps.item)"
						:disabled="slotProps.item.removed"
						content="Edit Song"
						v-tippy
					>
						edit
					</button>
					<quick-confirm
						v-if="
							hasPermission('songs.verify') &&
							slotProps.item.verified
						"
						@confirm="unverifyOne(slotProps.item._id)"
					>
						<button
							class="button is-danger icon-with-button material-icons"
							:disabled="slotProps.item.removed"
							content="Unverify Song"
							v-tippy
						>
							cancel
						</button>
					</quick-confirm>
					<button
						v-else-if="hasPermission('songs.verify')"
						class="button is-success icon-with-button material-icons"
						@click="verifyOne(slotProps.item._id)"
						:disabled="slotProps.item.removed"
						content="Verify Song"
						v-tippy
					>
						check_circle
					</button>
					<button
						v-if="hasPermission('songs.remove')"
						class="button is-danger icon-with-button material-icons"
						@click.prevent="
							openModal({
								modal: 'confirm',
								props: {
									message:
										'Removing this song will remove it from all playlists and cause a ratings recalculation.',
									onCompleted: () =>
										deleteOne(slotProps.item._id)
								}
							})
						"
						:disabled="slotProps.item.removed"
						content="Delete Song"
						v-tippy
					>
						delete_forever
					</button>
				</div>
			</template>
			<template #column-thumbnailImage="slotProps">
				<song-thumbnail class="song-thumbnail" :song="slotProps.item" />
			</template>
			<template #column-thumbnailUrl="slotProps">
				<a :href="slotProps.item.thumbnail" target="_blank">
					{{ slotProps.item.thumbnail }}
				</a>
			</template>
			<template #column-title="slotProps">
				<span :title="slotProps.item.title">{{
					slotProps.item.title
				}}</span>
			</template>
			<template #column-artists="slotProps">
				<span :title="slotProps.item.artists.join(', ')">{{
					slotProps.item.artists.join(", ")
				}}</span>
			</template>
			<template #column-genres="slotProps">
				<span :title="slotProps.item.genres.join(', ')">{{
					slotProps.item.genres.join(", ")
				}}</span>
			</template>
			<template #column-tags="slotProps">
				<span :title="slotProps.item.tags.join(', ')">{{
					slotProps.item.tags.join(", ")
				}}</span>
			</template>
			<template #column-_id="slotProps">
				<span :title="slotProps.item._id">{{
					slotProps.item._id
				}}</span>
			</template>
			<template #column-mediaSource="slotProps">
				<a
					v-if="
						slotProps.item.mediaSource.split(':')[0] === 'youtube'
					"
					:href="
						'https://www.youtube.com/watch?v=' +
						`${slotProps.item.mediaSource.split(':')[1]}`
					"
					target="_blank"
				>
					{{ slotProps.item.mediaSource }}
				</a>
				<span v-else>
					{{ slotProps.item.mediaSource }}
				</span>
			</template>
			<template #column-verified="slotProps">
				<span :title="slotProps.item.verified">{{
					slotProps.item.verified
				}}</span>
			</template>
			<template #column-duration="slotProps">
				<span :title="slotProps.item.duration">{{
					slotProps.item.duration
				}}</span>
			</template>
			<template #column-skipDuration="slotProps">
				<span :title="slotProps.item.skipDuration">{{
					slotProps.item.skipDuration
				}}</span>
			</template>
			<template #column-requestedBy="slotProps">
				<user-link :user-id="slotProps.item.requestedBy._id" />
			</template>
			<template #column-requestedAt="slotProps">
				<span
					:title="new Date(slotProps.item.requestedAt).toString()"
					>{{
						utils.getDateFormatted(slotProps.item.requestedAt)
					}}</span
				>
			</template>
			<template #column-verifiedBy="slotProps">
				<user-link :user-id="slotProps.item.verifiedBy._id" />
			</template>
			<template #column-verifiedAt="slotProps">
				<span :title="new Date(slotProps.item.verifiedAt).toString()">{{
					utils.getDateFormatted(slotProps.item.verifiedAt)
				}}</span>
			</template>
			<template #bulk-actions="slotProps">
				<div class="bulk-actions">
					<i
						v-if="hasPermission('songs.update')"
						class="material-icons edit-songs-icon"
						@click.prevent="editMany(slotProps.item)"
						content="Edit Songs"
						v-tippy
						tabindex="0"
					>
						edit
					</i>
					<i
						v-if="hasPermission('songs.verify')"
						class="material-icons verify-songs-icon"
						@click.prevent="verifyMany(slotProps.item)"
						content="Verify Songs"
						v-tippy
						tabindex="0"
					>
						check_circle
					</i>
					<quick-confirm
						v-if="hasPermission('songs.verify')"
						placement="left"
						@confirm="unverifyMany(slotProps.item)"
						tabindex="0"
					>
						<i
							class="material-icons unverify-songs-icon"
							content="Unverify Songs"
							v-tippy
						>
							cancel
						</i>
					</quick-confirm>
					<i
						v-if="
							hasPermission('songs.update') &&
							hasPermission('apis.searchDiscogs')
						"
						class="material-icons import-album-icon"
						@click.prevent="importAlbum(slotProps.item)"
						content="Import Album"
						v-tippy
						tabindex="0"
					>
						album
					</i>
					<i
						v-if="hasPermission('songs.update')"
						class="material-icons tag-songs-icon"
						@click.prevent="setTags(slotProps.item)"
						content="Set Tags"
						v-tippy
						tabindex="0"
					>
						local_offer
					</i>
					<i
						v-if="hasPermission('songs.update')"
						class="material-icons artists-songs-icon"
						@click.prevent="setArtists(slotProps.item)"
						content="Set Artists"
						v-tippy
						tabindex="0"
					>
						group
					</i>
					<i
						v-if="hasPermission('songs.update')"
						class="material-icons genres-songs-icon"
						@click.prevent="setGenres(slotProps.item)"
						content="Set Genres"
						v-tippy
						tabindex="0"
					>
						theater_comedy
					</i>
					<i
						v-if="hasPermission('playlists.songs.add')"
						class="material-icons playlist-bulk-edit-icon"
						@click.prevent="bulkEditPlaylist(slotProps.item)"
						content="Add/remove to/from playlist"
						v-tippy
						tabindex="0"
					>
						playlist_add
					</i>
					<i
						v-if="hasPermission('songs.remove')"
						class="material-icons delete-icon"
						@click.prevent="
							openModal({
								modal: 'confirm',
								props: {
									message:
										'Removing these songs will remove them from all playlists and cause a ratings recalculation.',
									onCompleted: () =>
										deleteMany(slotProps.item)
								}
							})
						"
						content="Delete Songs"
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

:deep(.bulk-popup .bulk-actions) {
	.verify-songs-icon {
		color: var(--green);
	}
	& > span {
		position: relative;
		top: 6px;
		margin-left: 5px;
		height: 25px;
		& > div {
			height: 25px;
			& > .unverify-songs-icon {
				color: var(--dark-red);
				top: unset;
				margin-left: unset;
			}
		}
	}
}
</style>
