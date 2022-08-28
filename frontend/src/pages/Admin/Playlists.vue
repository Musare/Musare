<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import { useModalsStore } from "@/stores/modals";
import { useUserAuthStore } from "@/stores/userAuth";
import utils from "@/utils";
import { TableColumn, TableFilter, TableEvents } from "@/types/advancedTable";

const AdvancedTable = defineAsyncComponent(
	() => import("@/components/AdvancedTable.vue")
);
const RunJobDropdown = defineAsyncComponent(
	() => import("@/components/RunJobDropdown.vue")
);
const UserLink = defineAsyncComponent(
	() => import("@/components/UserLink.vue")
);

const { hasPermission } = useUserAuthStore();

const columnDefault = ref(<TableColumn>{
	sortable: true,
	hidable: true,
	defaultVisibility: "shown",
	draggable: true,
	resizable: true,
	minWidth: 150,
	maxWidth: 600
});
const columns = ref(<TableColumn[]>[
	{
		name: "options",
		displayName: "Options",
		properties: ["_id"],
		sortable: false,
		hidable: false,
		resizable: false,
		minWidth: 76,
		defaultWidth: 76
	},
	{
		name: "displayName",
		displayName: "Display Name",
		properties: ["displayName"],
		sortProperty: "displayName"
	},
	{
		name: "type",
		displayName: "Type",
		properties: ["type"],
		sortProperty: "type"
	},
	{
		name: "privacy",
		displayName: "Privacy",
		properties: ["privacy"],
		sortProperty: "privacy"
	},
	{
		name: "songsCount",
		displayName: "Songs #",
		properties: ["songsCount"],
		sortProperty: "songsCount",
		minWidth: 100,
		defaultWidth: 100
	},
	{
		name: "totalLength",
		displayName: "Total Length",
		properties: ["totalLength"],
		sortProperty: "totalLength",
		minWidth: 250,
		defaultWidth: 250
	},
	{
		name: "createdBy",
		displayName: "Created By",
		properties: ["createdBy"],
		sortProperty: "createdBy",
		defaultWidth: 150
	},
	{
		name: "createdAt",
		displayName: "Created At",
		properties: ["createdAt"],
		sortProperty: "createdAt",
		defaultWidth: 150
	},
	{
		name: "createdFor",
		displayName: "Created For",
		properties: ["createdFor"],
		sortProperty: "createdFor",
		minWidth: 230,
		defaultWidth: 230
	},
	{
		name: "_id",
		displayName: "Playlist ID",
		properties: ["_id"],
		sortProperty: "_id",
		minWidth: 230,
		defaultWidth: 230
	}
]);
const filters = ref(<TableFilter[]>[
	{
		name: "_id",
		displayName: "Playlist ID",
		property: "_id",
		filterTypes: ["exact"],
		defaultFilterType: "exact"
	},
	{
		name: "displayName",
		displayName: "Display Name",
		property: "displayName",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "type",
		displayName: "Type",
		property: "type",
		filterTypes: ["exact"],
		defaultFilterType: "exact",
		dropdown: [
			["genre", "Genre"],
			["station", "Station"],
			["user", "User"],
			["user-disliked", "User Disliked"],
			["user-liked", "User Liked"]
		]
	},
	{
		name: "privacy",
		displayName: "Privacy",
		property: "privacy",
		filterTypes: ["exact"],
		defaultFilterType: "exact",
		dropdown: [
			["public", "Public"],
			["private", "Private"]
		]
	},
	{
		name: "songsCount",
		displayName: "Songs Count",
		property: "songsCount",
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
		name: "totalLength",
		displayName: "Total Length",
		property: "totalLength",
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
		name: "createdBy",
		displayName: "Created By",
		property: "createdBy",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	},
	{
		name: "createdAt",
		displayName: "Created At",
		property: "createdAt",
		filterTypes: ["datetimeBefore", "datetimeAfter"],
		defaultFilterType: "datetimeBefore"
	},
	{
		name: "createdFor",
		displayName: "Created For",
		property: "createdFor",
		filterTypes: ["contains", "exact", "regex"],
		defaultFilterType: "contains"
	}
]);
const events = ref(<TableEvents>{
	adminRoom: "playlists",
	updated: {
		event: "admin.playlist.updated",
		id: "playlist._id",
		item: "playlist"
	},
	removed: {
		event: "admin.playlist.deleted",
		id: "playlistId"
	}
});
const jobs = ref([]);
if (hasPermission("playlists.deleteOrphaned")) {
	jobs.value.push({
		name: "Delete orphaned station playlists",
		socket: "playlists.deleteOrphanedStationPlaylists"
	});
	jobs.value.push({
		name: "Delete orphaned genre playlists",
		socket: "playlists.deleteOrphanedGenrePlaylists"
	});
}
if (hasPermission("playlists.requestOrphanedPlaylistSongs"))
	jobs.value.push({
		name: "Request orphaned playlist songs",
		socket: "playlists.requestOrphanedPlaylistSongs"
	});
if (hasPermission("playlists.clearAndRefillAll")) {
	jobs.value.push({
		name: "Clear and refill all station playlists",
		socket: "playlists.clearAndRefillAllStationPlaylists"
	});
	jobs.value.push({
		name: "Clear and refill all genre playlists",
		socket: "playlists.clearAndRefillAllGenrePlaylists"
	});
}
if (hasPermission("playlists.createMissing"))
	jobs.value.push({
		name: "Create missing genre playlists",
		socket: "playlists.createMissingGenrePlaylists"
	});

const { openModal } = useModalsStore();

const getDateFormatted = createdAt => {
	const date = new Date(createdAt);
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	const hour = `${date.getHours()}`.padStart(2, "0");
	const minute = `${date.getMinutes()}`.padStart(2, "0");
	return `${year}-${month}-${day} ${hour}:${minute}`;
};

const formatTimeLong = length => utils.formatTimeLong(length);
</script>

<template>
	<div class="admin-tab">
		<page-metadata title="Admin | Playlists" />
		<div class="card tab-info">
			<div class="info-row">
				<h1>Playlist</h1>
				<p>Manage playlists</p>
			</div>
			<div class="button-row">
				<run-job-dropdown :jobs="jobs" />
			</div>
		</div>
		<advanced-table
			:column-default="columnDefault"
			:columns="columns"
			:filters="filters"
			data-action="playlists.getData"
			name="admin-playlists"
			:events="events"
		>
			<template #column-options="slotProps">
				<div class="row-options">
					<button
						class="button is-primary icon-with-button material-icons"
						@click="
							openModal({
								modal: 'editPlaylist',
								data: { playlistId: slotProps.item._id }
							})
						"
						:disabled="slotProps.item.removed"
						content="Edit Playlist"
						v-tippy
					>
						edit
					</button>
				</div>
			</template>
			<template #column-displayName="slotProps">
				<span :title="slotProps.item.displayName">{{
					slotProps.item.displayName
				}}</span>
			</template>
			<template #column-type="slotProps">
				<span :title="slotProps.item.type">{{
					slotProps.item.type
				}}</span>
			</template>
			<template #column-privacy="slotProps">
				<span :title="slotProps.item.privacy">{{
					slotProps.item.privacy
				}}</span>
			</template>
			<template #column-songsCount="slotProps">
				<span :title="slotProps.item.songsCount">{{
					slotProps.item.songsCount
				}}</span>
			</template>
			<template #column-totalLength="slotProps">
				<span :title="formatTimeLong(slotProps.item.totalLength)">{{
					formatTimeLong(slotProps.item.totalLength)
				}}</span>
			</template>
			<template #column-createdBy="slotProps">
				<span v-if="slotProps.item.createdBy === 'Musare'">Musare</span>
				<user-link v-else :user-id="slotProps.item.createdBy" />
			</template>
			<template #column-createdAt="slotProps">
				<span :title="new Date(slotProps.item.createdAt).toString()">{{
					getDateFormatted(slotProps.item.createdAt)
				}}</span>
			</template>
			<template #column-createdFor="slotProps">
				<span :title="slotProps.item.createdFor">{{
					slotProps.item.createdFor
				}}</span>
			</template>
			<template #column-_id="slotProps">
				<span :title="slotProps.item._id">{{
					slotProps.item._id
				}}</span>
			</template>
		</advanced-table>
	</div>
</template>
