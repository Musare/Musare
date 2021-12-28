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
			>
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
					<span :title="slotProps.item.songs.length">{{
						slotProps.item.songs.length
					}}</span>
				</template>
				<template #column-totalLength="slotProps">
					<span
						:title="totalLengthForPlaylist(slotProps.item.songs)"
						>{{
							totalLengthForPlaylist(slotProps.item.songs)
						}}</span
					>
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
				<template #bulk-actions="slotProps">
					<div class="playlist-bulk-actions">
						<i
							class="material-icons edit-playlists-icon"
							@click.prevent="editMany(slotProps.item)"
							content="Edit Playlists"
							v-tippy
						>
							edit
						</i>
						<quick-confirm
							placement="left"
							@confirm="deleteMany(slotProps.item)"
						>
							<i
								class="material-icons delete-playlists-icon"
								content="Delete Playlists"
								v-tippy
							>
								delete_forever
							</i>
						</quick-confirm>
					</div>
				</template>
			</advanced-table>
		</div>

		<edit-playlist v-if="modals.editPlaylist" sector="admin" />
		<edit-song v-if="modals.editSong" song-type="songs" />
		<report v-if="modals.report" />
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import { defineAsyncComponent } from "vue";

import Toast from "toasters";

import AdvancedTable from "@/components/AdvancedTable.vue";
import RunJobDropdown from "@/components/RunJobDropdown.vue";
import UserIdToUsername from "@/components/UserIdToUsername.vue";
import QuickConfirm from "@/components/QuickConfirm.vue";

import utils from "../../../../js/utils";

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
		UserIdToUsername,
		QuickConfirm
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
					properties: ["songs"],
					sortable: false,
					minWidth: 80,
					defaultWidth: 80
				},
				{
					name: "totalLength",
					displayName: "Total Length",
					properties: ["songs"],
					sortable: false,
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
					displayName: "ID",
					properties: ["_id"],
					sortProperty: "_id",
					minWidth: 230,
					defaultWidth: 230
				}
			],
			filters: [
				{
					name: "_id",
					displayName: "ID",
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
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "privacy",
					displayName: "Privacy",
					property: "privacy",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
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
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "createdFor",
					displayName: "Created For",
					property: "createdFor",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				}
			],
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
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		// TODO
		// this.socket.on("event:admin.playlist.created", res =>
		// 	this.addPlaylist(res.data.playlist)
		// );
		// this.socket.on("event:admin.playlist.deleted", res =>
		// 	this.removePlaylist(res.data.playlistId)
		// );
		// this.socket.on("event:admin.playlist.song.added", res =>
		// 	this.addPlaylistSong({
		// 		playlistId: res.data.playlistId,
		// 		song: res.data.song
		// 	})
		// );
		// this.socket.on("event:admin.playlist.song.removed", res =>
		// 	this.removePlaylistSong({
		// 		playlistId: res.data.playlistId,
		// 		youtubeId: res.data.youtubeId
		// 	})
		// );
		// this.socket.on("event:admin.playlist.displayName.updated", res =>
		// 	this.updatePlaylistDisplayName({
		// 		playlistId: res.data.playlistId,
		// 		displayName: res.data.displayName
		// 	})
		// );
		// this.socket.on("event:admin.playlist.privacy.updated", res =>
		// 	this.updatePlaylistPrivacy({
		// 		playlistId: res.data.playlistId,
		// 		privacy: res.data.privacy
		// 	})
		// );
	},
	methods: {
		editMany(selectedRows) {
			if (selectedRows.length === 1) {
				this.editPlaylist(selectedRows[0]._id);
				this.openModal("editPlaylist");
			} else {
				new Toast("Bulk editing not yet implemented.");
			}
		},
		deleteMany() {
			new Toast("Bulk deleting not yet implemented.");
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
		totalLengthForPlaylist(songs) {
			let length = 0;
			songs.forEach(song => {
				length += song.duration;
			});
			return this.utils.formatTimeLong(length);
		},
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("user/playlists", ["editPlaylist"])
	}
};
</script>

<style lang="scss" scoped>
.bulk-popup {
	.playlist-bulk-actions {
		display: flex;
		flex-direction: row;
		width: 100%;
		justify-content: space-evenly;

		.material-icons {
			position: relative;
			top: 6px;
			margin-left: 5px;
			cursor: pointer;
			color: var(--primary-color);

			&:hover,
			&:focus {
				filter: brightness(90%);
			}
		}
		.delete-playlists-icon {
			color: var(--dark-red);
		}
	}
}
</style>
