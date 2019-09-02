<template>
	<div>
		<metadata title="Admin | Stations" />
		<div class="container">
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
					<tr v-for="(station, index) in stations" :key="index">
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
								:userId="station.owner"
								:link="true"
							/>
						</td>
						<td>
							<a class="button is-info" v-on:click="edit(station)"
								>Edit</a
							>
							<a
								class="button is-danger"
								href="#"
								@click="removeStation(index)"
								>Remove</a
							>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<div class="container">
			<div class="card is-fullwidth">
				<header class="card-header">
					<p class="card-header-title">
						Create official station
					</p>
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
										id="new-genre"
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
									:key="index"
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
										id="new-blacklisted-genre"
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
									v-for="(genre,
									index) in newStation.blacklistedGenres"
									:key="index"
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

		<edit-station v-if="modals.editStation" />
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";

import { Toast } from "vue-roaster";
import io from "../../io";

import EditStation from "./EditStation.vue";
import UserIdToUsername from "../UserIdToUsername.vue";

export default {
	components: { EditStation, UserIdToUsername },
	data() {
		return {
			stations: [],
			newStation: {
				genres: [],
				blacklistedGenres: []
			}
		};
	},
	computed: {
		...mapState("modals", {
			modals: state => state.modals.station
		})
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
				return Toast.methods.addToast(
					"Field (Name) cannot be empty",
					3000
				);
			if (displayName === undefined)
				return Toast.methods.addToast(
					"Field (Display Name) cannot be empty",
					3000
				);
			if (description === undefined)
				return Toast.methods.addToast(
					"Field (Description) cannot be empty",
					3000
				);

			return this.socket.emit(
				"stations.create",
				{
					name,
					type: "official",
					displayName,
					description,
					genres,
					blacklistedGenres
				},
				result => {
					Toast.methods.addToast(result.message, 3000);
					if (result.status === "success")
						this.newStation = {
							genres: [],
							blacklistedGenres: []
						};
				}
			);
		},
		removeStation(index) {
			this.socket.emit(
				"stations.remove",
				this.stations[index]._id,
				res => {
					Toast.methods.addToast(res.message, 3000);
				}
			);
		},
		edit(station) {
			this.editStation({
				_id: station._id,
				name: station.name,
				type: station.type,
				partyMode: station.partyMode,
				description: station.description,
				privacy: station.privacy,
				displayName: station.displayName,
				genres: station.genres,
				blacklistedGenres: station.blacklistedGenres
			});
			this.openModal({
				sector: "station",
				modal: "editStation"
			});
		},
		addGenre() {
			const genre = document
				.getElementById(`new-genre`)
				.value.toLowerCase()
				.trim();
			if (this.newStation.genres.indexOf(genre) !== -1)
				return Toast.methods.addToast("Genre already exists", 3000);
			if (genre) {
				this.newStation.genres.push(genre);
				document.getElementById(`new-genre`).value = "";
				return true;
			}
			return Toast.methods.addToast("Genre cannot be empty", 3000);
		},
		removeGenre(index) {
			this.newStation.genres.splice(index, 1);
		},
		addBlacklistedGenre() {
			const genre = document
				.getElementById(`new-blacklisted-genre`)
				.value.toLowerCase()
				.trim();
			if (this.newStation.blacklistedGenres.indexOf(genre) !== -1)
				return Toast.methods.addToast("Genre already exists", 3000);

			if (genre) {
				this.newStation.blacklistedGenres.push(genre);
				document.getElementById(`new-blacklisted-genre`).value = "";
				return true;
			}
			return Toast.methods.addToast("Genre cannot be empty", 3000);
		},
		removeBlacklistedGenre(index) {
			this.newStation.blacklistedGenres.splice(index, 1);
		},
		init() {
			this.socket.emit("stations.index", data => {
				this.stations = data.stations;
			});
			this.socket.emit("apis.joinAdminRoom", "stations", () => {});
		},
		...mapActions("modals", ["openModal"]),
		...mapActions("admin/stations", ["editStation"])
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
			if (this.socket.connected) this.init();
			this.socket.on("event:admin.station.added", station => {
				this.stations.push(station);
			});
			this.socket.on("event:admin.station.removed", stationId => {
				this.stations = this.stations.filter(station => {
					return station._id !== stationId;
				});
			});
			io.onConnect(() => {
				this.init();
			});
		});
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

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
}

.is-info:focus {
	background-color: $primary-color;
}

.genre-wrapper {
	display: flex;
	justify-content: space-around;
}

.card-footer-item {
	color: $primary-color;
}
</style>
