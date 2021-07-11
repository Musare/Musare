<template>
	<div>
		<metadata title="Admin | Stations" />
		<div class="container">
			<button class="button is-primary" @click="clearEveryStationQueue()">
				Clear every station queue
			</button>
			<br />
			<br />
			<table class="table is-striped">
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
							<confirm @confirm="removeStation(index)">
								<a class="button is-danger">Remove</a>
							</confirm>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<div class="container">
			<div class="card is-fullwidth">
				<header class="card-header">
					<p class="card-header-title">Create official station</p>
				</header>
				<div class="card-content">
					<div class="content">
						<div class="control is-horizontal">
							<div class="control is-grouped">
								<p class="control is-expanded">
									<input
										v-model="newStation.name"
										class="input"
										type="text"
										placeholder="Name"
									/>
								</p>
								<p class="control is-expanded">
									<input
										v-model="newStation.displayName"
										class="input"
										type="text"
										placeholder="Display Name"
									/>
								</p>
							</div>
						</div>
						<label class="label">Description</label>
						<p class="control is-expanded">
							<input
								v-model="newStation.description"
								class="input"
								type="text"
								placeholder="Short description"
							/>
						</p>
						<div class="control is-grouped genre-wrapper">
							<div class="sector">
								<p class="control has-addons">
									<input
										ref="new-genre"
										class="input"
										type="text"
										placeholder="Genre"
										@keyup.enter="addGenre()"
									/>
									<a
										class="button is-info"
										href="#"
										@click="addGenre()"
										>Add genre</a
									>
								</p>
								<span
									v-for="(genre, index) in newStation.genres"
									:key="genre"
									class="tag is-info"
								>
									{{ genre }}
									<button
										class="delete is-info"
										@click="removeGenre(index)"
									/>
								</span>
							</div>
							<div class="sector">
								<p class="control has-addons">
									<input
										ref="new-blacklisted-genre"
										class="input"
										type="text"
										placeholder="Blacklisted Genre"
										@keyup.enter="addBlacklistedGenre()"
									/>
									<a
										class="button is-info"
										href="#"
										@click="addBlacklistedGenre()"
										>Add blacklisted genre</a
									>
								</p>
								<span
									v-for="(
										genre, index
									) in newStation.blacklistedGenres"
									:key="genre"
									class="tag is-info"
								>
									{{ genre }}
									<button
										class="delete is-info"
										@click="removeBlacklistedGenre(index)"
									/>
								</span>
							</div>
						</div>
					</div>
				</div>
				<footer class="card-footer">
					<a
						class="card-footer-item"
						href="#"
						@click="createStation()"
						>Create</a
					>
				</footer>
			</div>
		</div>

		<request-song v-if="modals.requestSong" />
		<edit-playlist v-if="modals.editPlaylist" />
		<create-playlist v-if="modals.createPlaylist" />
		<manage-station
			v-if="modals.manageStation"
			:station-id="editingStationId"
			sector="admin"
		/>
		<report v-if="modals.report" />
		<edit-song v-if="modals.editSong" song-type="songs" sector="admin" />
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import { defineAsyncComponent } from "vue";

import Toast from "toasters";
import UserIdToUsername from "@/components/UserIdToUsername.vue";
import Confirm from "@/components/Confirm.vue";
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
		UserIdToUsername,
		Confirm
	},
	data() {
		return {
			editingStationId: "",
			newStation: {
				genres: [],
				blacklistedGenres: []
			}
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
		if (this.socket.readyState === 1) this.init();
		ws.onConnect(() => this.init());

		this.socket.on("event:admin.station.created", res =>
			this.stationAdded(res.data.station)
		);

		this.socket.on("event:admin.station.deleted", res =>
			this.stationRemoved(res.data.stationId)
		);
	},
	methods: {
		createStation() {
			const {
				newStation: {
					name,
					displayName,
					description,
					genres,
					blacklistedGenres
				}
			} = this;

			if (name === undefined)
				return new Toast("Field (Name) cannot be empty");
			if (displayName === undefined)
				return new Toast("Field (Display Name) cannot be empty");
			if (description === undefined)
				return new Toast("Field (Description) cannot be empty");

			return this.socket.dispatch(
				"stations.create",
				{
					name,
					type: "official",
					displayName,
					description,
					genres,
					blacklistedGenres
				},
				res => {
					new Toast(res.message);
					if (res.status === "success")
						this.newStation = {
							genres: [],
							blacklistedGenres: []
						};
				}
			);
		},
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
		addGenre() {
			const genre = this.$refs["new-genre"].value.toLowerCase().trim();
			if (this.newStation.genres.indexOf(genre) !== -1)
				return new Toast("Genre already exists");
			if (genre) {
				this.newStation.genres.push(genre);
				this.$refs["new-genre"].value = "";
				return true;
			}
			return new Toast("Genre cannot be empty");
		},
		removeGenre(index) {
			this.newStation.genres.splice(index, 1);
		},
		addBlacklistedGenre() {
			const genre = this.$refs["new-blacklisted-genre"].value
				.toLowerCase()
				.trim();
			if (this.newStation.blacklistedGenres.indexOf(genre) !== -1)
				return new Toast("Genre already exists");

			if (genre) {
				this.newStation.blacklistedGenres.push(genre);
				this.$refs["new-blacklisted-genre"].value = "";
				return true;
			}
			return new Toast("Genre cannot be empty");
		},
		removeBlacklistedGenre(index) {
			this.newStation.blacklistedGenres.splice(index, 1);
		},
		clearEveryStationQueue() {
			this.socket.dispatch("stations.clearEveryStationQueue", res => {
				if (res.status === "success") new Toast(res.message);
				else new Toast(`Error: ${res.message}`);
			});
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

	.card {
		background: var(--dark-grey-3);

		.card-header {
			box-shadow: 0 1px 2px rgba(10, 10, 10, 0.8);
		}

		p,
		.label {
			color: var(--light-grey-2);
		}
	}
}

.tag {
	margin-top: 5px;
	&:not(:last-child) {
		margin-right: 5px;
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

.genre-wrapper {
	display: flex;
	justify-content: space-around;
}

.card-footer-item {
	color: var(--primary-color);
}
</style>
