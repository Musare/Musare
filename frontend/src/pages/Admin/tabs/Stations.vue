<template>
	<div>
		<page-metadata title="Admin | Stations" />
		<div class="container">
			<div class="button-row">
				<button
					class="button is-primary"
					@click="openModal('createStation')"
				>
					Create Station
				</button>
				<run-job-dropdown :jobs="jobs" />
			</div>
			<table class="table">
				<thead>
					<tr>
						<td>ID</td>
						<td>Name</td>
						<td>Type</td>
						<td>Display Name</td>
						<td>Description</td>
						<td>Owner</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(station, index) in stations" :key="station._id">
						<td>
							<span>{{ station._id }}</span>
						</td>
						<td>
							<span>
								<router-link
									:to="{
										name: 'station',
										params: { id: station.name }
									}"
								>
									{{ station.name }}
								</router-link>
							</span>
						</td>
						<td>
							<span>{{ station.type }}</span>
						</td>
						<td>
							<span>{{ station.displayName }}</span>
						</td>
						<td>
							<span>{{ station.description }}</span>
						</td>
						<td>
							<span
								v-if="station.type === 'official'"
								title="Musare"
								>Musare</span
							>
							<user-id-to-username
								v-else
								:user-id="station.owner"
								:link="true"
							/>
						</td>
						<td>
							<a class="button is-info" @click="manage(station)"
								>Manage</a
							>
							<quick-confirm @confirm="removeStation(index)">
								<a class="button is-danger">Remove</a>
							</quick-confirm>
						</td>
					</tr>
				</tbody>
			</table>
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
import UserIdToUsername from "@/components/UserIdToUsername.vue";
import QuickConfirm from "@/components/QuickConfirm.vue";
import RunJobDropdown from "@/components/RunJobDropdown.vue";
import ws from "@/ws";

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
		UserIdToUsername,
		QuickConfirm,
		RunJobDropdown
	},
	data() {
		return {
			editingStationId: "",
			jobs: [
				{
					name: "Clear every station queue",
					socket: "stations.clearEveryStationQueue"
				}
			]
		};
	},
	computed: {
		...mapState("admin/stations", {
			stations: state => state.stations
		}),
		...mapState("modalVisibility", {
			modals: state => state.modals
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		ws.onConnect(this.init);

		this.socket.on("event:admin.station.created", res =>
			this.stationAdded(res.data.station)
		);

		this.socket.on("event:admin.station.deleted", res =>
			this.stationRemoved(res.data.stationId)
		);
	},
	methods: {
		removeStation(index) {
			this.socket.dispatch(
				"stations.remove",
				this.stations[index]._id,
				res => new Toast(res.message)
			);
		},
		manage(station) {
			this.editingStationId = station._id;
			this.openModal("manageStation");
		},
		init() {
			this.socket.dispatch("stations.index", res => {
				if (res.status === "success")
					this.loadStations(res.data.stations);
			});

			this.socket.dispatch("apis.joinAdminRoom", "stations", () => {});
		},
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("admin/stations", [
			"manageStation",
			"loadStations",
			"stationRemoved",
			"stationAdded"
		])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.table {
		color: var(--light-grey-2);
		background-color: var(--dark-grey-3);

		thead tr {
			background: var(--dark-grey-3);
			td {
				color: var(--white);
			}
		}

		tbody tr:hover {
			background-color: var(--dark-grey-4) !important;
		}

		tbody tr:nth-child(even) {
			background-color: var(--dark-grey-2);
		}

		strong {
			color: var(--light-grey-2);
		}
	}
}

td {
	word-wrap: break-word;
	max-width: 10vw;
	vertical-align: middle;

	& > div {
		display: inline-flex;
	}
}

.is-info:focus {
	background-color: var(--primary-color);
}
</style>
