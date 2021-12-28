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
			>
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
				<template #bulk-actions="slotProps">
					<div class="station-bulk-actions">
						<i
							class="material-icons edit-stations-icon"
							@click.prevent="editMany(slotProps.item)"
							content="Edit Stations"
							v-tippy
						>
							edit
						</i>
						<quick-confirm
							placement="left"
							@confirm="deleteMany(slotProps.item)"
						>
							<i
								class="material-icons delete-stations-icon"
								content="Delete Stations"
								v-tippy
							>
								delete_forever
							</i>
						</quick-confirm>
					</div>
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

import Toast from "toasters";
import AdvancedTable from "@/components/AdvancedTable.vue";
import UserIdToUsername from "@/components/UserIdToUsername.vue";
import QuickConfirm from "@/components/QuickConfirm.vue";
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
		QuickConfirm,
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
					name: "_id",
					displayName: "ID",
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
					name: "owner",
					displayName: "Owner",
					property: "owner",
					filterTypes: ["contains", "exact", "regex"],
					defaultFilterType: "contains"
				}
			],
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
		editMany(selectedRows) {
			if (selectedRows.length === 1) {
				this.editingStationId = selectedRows[0]._id;
				this.openModal("manageStation");
			} else {
				new Toast("Bulk editing not yet implemented.");
			}
		},
		deleteMany(selectedRows) {
			if (selectedRows.length === 1) {
				this.socket.dispatch(
					"stations.remove",
					selectedRows[0]._id,
					res => new Toast(res.message)
				);
			} else {
				new Toast("Bulk deleting not yet implemented.");
			}
		},
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>

<style lang="scss" scoped>
.bulk-popup {
	.station-bulk-actions {
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
		.delete-stations-icon {
			color: var(--dark-red);
		}
	}
}
</style>
