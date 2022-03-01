<template>
	<div>
		<page-metadata title="Admin | Playlists" />
		<div class="admin-tab">
			<div class="button-row">
				<run-job-dropdown :jobs="jobs" />
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
							@click="edit(slotProps.item._id)"
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
					<span v-if="slotProps.item.createdBy === 'Musare'"
						>Musare</span
					>
					<user-id-to-username
						v-else
						:user-id="slotProps.item.createdBy"
						:link="true"
					/>
				</template>
				<template #column-createdAt="slotProps">
					<span :title="new Date(slotProps.item.createdAt)">{{
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

		<edit-playlist v-if="modals.editPlaylist" sector="admin" />
		<edit-song v-if="modals.editSong" song-type="songs" />
		<report v-if="modals.report" />
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import { defineAsyncComponent } from "vue";

import AdvancedTable from "@/components/AdvancedTable.vue";
import RunJobDropdown from "@/components/RunJobDropdown.vue";
import UserIdToUsername from "@/components/UserIdToUsername.vue";

import utils from "../../../js/utils";

export default {
	components: {
		EditPlaylist: defineAsyncComponent(() =>
			import("@/components/modals/EditPlaylist")
		),
		Report: defineAsyncComponent(() =>
			import("@/components/modals/Report.vue")
		),
		EditSong: defineAsyncComponent(() =>
			import("@/components/modals/EditSong")
		),
		AdvancedTable,
		RunJobDropdown,
		UserIdToUsername
	},
	data() {
		return {
			utils,
			columnDefault: {
				sortable: true,
				hidable: true,
				defaultVisibility: "shown",
				draggable: true,
				resizable: true,
				minWidth: 150,
				maxWidth: 600
			},
			columns: [
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
			],
			filters: [
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
			],
			events: {
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
			},
			jobs: [
				{
					name: "Delete orphaned station playlists",
					socket: "playlists.deleteOrphanedStationPlaylists"
				},
				{
					name: "Delete orphaned genre playlists",
					socket: "playlists.deleteOrphanedGenrePlaylists"
				},
				{
					name: "Request orphaned playlist songs",
					socket: "playlists.requestOrphanedPlaylistSongs"
				},
				{
					name: "Clear and refill all station playlists",
					socket: "playlists.clearAndRefillAllStationPlaylists"
				},
				{
					name: "Clear and refill all genre playlists",
					socket: "playlists.clearAndRefillAllGenrePlaylists"
				},
				{
					name: "Create missing genre playlists",
					socket: "playlists.createMissingGenrePlaylists"
				}
			]
		};
	},
	computed: {
		...mapState("modalVisibility", {
			modals: state => state.modals
		})
	},
	methods: {
		edit(playlistId) {
			this.editPlaylist(playlistId);
			this.openModal("editPlaylist");
		},
		getDateFormatted(createdAt) {
			const date = new Date(createdAt);
			const year = date.getFullYear();
			const month = `${date.getMonth() + 1}`.padStart(2, 0);
			const day = `${date.getDate()}`.padStart(2, 0);
			const hour = `${date.getHours()}`.padStart(2, 0);
			const minute = `${date.getMinutes()}`.padStart(2, 0);
			return `${year}-${month}-${day} ${hour}:${minute}`;
		},
		formatTimeLong(length) {
			return this.utils.formatTimeLong(length);
		},
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/playlists", ["editPlaylist"])
	}
};
</script>