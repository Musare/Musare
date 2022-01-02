<template>
	<div>
		<page-metadata title="Admin | Stations" />
		<div class="admin-tab">
			<div class="button-row">
				<button
					class="button is-primary"
					@click="openModal('createStation')"
				>
					Create Station
				</button>
				<run-job-dropdown :jobs="jobs" />
			</div>
			<advanced-table
				:column-default="columnDefault"
				:columns="columns"
				:filters="filters"
				data-action="stations.getData"
				name="admin-stations"
				:events="events"
			>
				<template #column-options="slotProps">
					<div class="row-options">
						<button
							class="
								button
								is-primary
								icon-with-button
								material-icons
							"
							@click="edit(slotProps.item._id)"
							:disabled="slotProps.item.removed"
							content="Manage Station"
							v-tippy
						>
							settings
						</button>
					</div>
				</template>
				<template #column-_id="slotProps">
					<span :title="slotProps.item._id">{{
						slotProps.item._id
					}}</span>
				</template>
				<template #column-name="slotProps">
					<span :title="slotProps.item.name">{{
						slotProps.item.name
					}}</span>
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
				<template #column-description="slotProps">
					<span :title="slotProps.item.description">{{
						slotProps.item.description
					}}</span>
				</template>
				<template #column-privacy="slotProps">
					<span :title="slotProps.item.privacy">{{
						slotProps.item.privacy
					}}</span>
				</template>
				<template #column-owner="slotProps">
					<span v-if="slotProps.item.type === 'official'"
						>Musare</span
					>
					<user-id-to-username
						v-else
						:user-id="slotProps.item.owner"
						:link="true"
					/>
				</template>
				<template #column-stationMode="slotProps">
					<span
						:title="slotProps.item.partyMode ? 'Party' : 'Playlist'"
						>{{
							slotProps.item.partyMode ? "Party" : "Playlist"
						}}</span
					>
				</template>
				<template #column-playMode="slotProps">
					<span :title="slotProps.item.playMode">{{
						slotProps.item.playMode
					}}</span>
				</template>
				<template #column-theme="slotProps">
					<span :title="slotProps.item.theme">{{
						slotProps.item.theme
					}}</span>
				</template>
			</advanced-table>
		</div>

		<request-song v-if="modals.requestSong" />
		<create-playlist v-if="modals.createPlaylist" />
		<manage-station
			v-if="modals.manageStation"
			:station-id="editingStationId"
			sector="admin"
		/>
		<edit-playlist v-if="modals.editPlaylist" />
		<edit-song v-if="modals.editSong" song-type="songs" sector="admin" />
		<report v-if="modals.report" />
		<create-station v-if="modals.createStation" :official="true" />
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import { defineAsyncComponent } from "vue";

import AdvancedTable from "@/components/AdvancedTable.vue";
import UserIdToUsername from "@/components/UserIdToUsername.vue";
import RunJobDropdown from "@/components/RunJobDropdown.vue";

export default {
	components: {
		RequestSong: defineAsyncComponent(() =>
			import("@/components/modals/RequestSong.vue")
		),
		EditPlaylist: defineAsyncComponent(() =>
			import("@/components/modals/EditPlaylist")
		),
		CreatePlaylist: defineAsyncComponent(() =>
			import("@/components/modals/CreatePlaylist.vue")
		),
		ManageStation: defineAsyncComponent(() =>
			import("@/components/modals/ManageStation/index.vue")
		),
		Report: defineAsyncComponent(() =>
			import("@/components/modals/Report.vue")
		),
		EditSong: defineAsyncComponent(() =>
			import("@/components/modals/EditSong")
		),
		CreateStation: defineAsyncComponent(() =>
			import("@/components/modals/CreateStation.vue")
		),
		AdvancedTable,
		UserIdToUsername,
		RunJobDropdown
	},
	data() {
		return {
			editingStationId: "",
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
					displayName: "Edit",
					properties: ["_id"],
					sortable: false,
					hidable: false,
					resizable: false,
					minWidth: 51,
					defaultWidth: 51
				},
				{
					name: "_id",
					displayName: "Station ID",
					properties: ["_id"],
					sortProperty: "_id",
					minWidth: 230,
					defaultWidth: 230
				},
				{
					name: "name",
					displayName: "Name",
					properties: ["name"],
					sortProperty: "name"
				},
				{
					name: "displayName",
					displayName: "Display Name",
					properties: ["displayName"],
					sortProperty: "displayName"
				},
				{
					name: "description",
					displayName: "Description",
					properties: ["description"],
					sortProperty: "description",
					defaultVisibility: "hidden"
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
					name: "owner",
					displayName: "Owner",
					properties: ["owner", "type"],
					sortProperty: "owner",
					defaultWidth: 150
				},
				{
					name: "stationMode",
					displayName: "Station Mode",
					properties: ["partyMode"],
					sortable: false,
					defaultVisibility: "hidden"
				},
				{
					name: "playMode",
					displayName: "Play Mode",
					properties: ["playMode"],
					sortable: false,
					defaultVisibility: "hidden"
				},
				{
					name: "theme",
					displayName: "Theme",
					properties: ["theme"],
					sortProperty: "theme",
					defaultVisibility: "hidden"
				}
			],
			filters: [
				{
					name: "_id",
					displayName: "Station ID",
					property: "_id",
					filterTypes: ["exact"],
					defaultFilterType: "exact"
				},
				{
					name: "name",
					displayName: "Name",
					property: "name",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "displayName",
					displayName: "Display Name",
					property: "displayName",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "description",
					displayName: "Description",
					property: "description",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "type",
					displayName: "Type",
					property: "type",
					filterTypes: ["array", "regex"],
					defaultFilterType: "array",
					filterValues: ["official", "community"]
				},
				{
					name: "privacy",
					displayName: "Privacy",
					property: "privacy",
					filterTypes: ["array", "regex"],
					defaultFilterType: "array",
					filterValues: ["public", "unlisted", "private"]
				},
				{
					name: "owner",
					displayName: "Owner",
					property: "owner",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				},
				{
					name: "playMode",
					displayName: "Play Mode",
					property: "playMode",
					filterTypes: ["array", "regex"],
					defaultFilterType: "array",
					filterValues: ["random", "sequential"]
				},
				{
					name: "theme",
					displayName: "Theme",
					property: "theme",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				}
			],
			events: {
				adminRoom: "stations",
				removed: {
					event: "admin.station.deleted",
					id: "stationId"
				}
			},
			jobs: [
				{
					name: "Clear every station queue",
					socket: "stations.clearEveryStationQueue"
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
		// this.socket.on("event:admin.station.created", res =>
		// 	this.stationAdded(res.data.station)
		// );
		// this.socket.on("event:admin.station.deleted", res =>
		// 	this.stationRemoved(res.data.stationId)
		// );
	},
	methods: {
		edit(stationId) {
			this.editingStationId = stationId;
			this.openModal("manageStation");
		},
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>
