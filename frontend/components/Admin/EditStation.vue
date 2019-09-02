<template>
	<modal title="Edit Station">
		<template v-slot:body>
			<label class="label">Name</label>
			<p class="control">
				<input
					v-model="editing.name"
					class="input"
					type="text"
					placeholder="Station Name"
				/>
			</p>
			<label class="label">Display name</label>
			<p class="control">
				<input
					v-model="editing.displayName"
					class="input"
					type="text"
					placeholder="Station Display Name"
				/>
			</p>
			<label class="label">Description</label>
			<p class="control">
				<input
					v-model="editing.description"
					class="input"
					type="text"
					placeholder="Station Description"
				/>
			</p>
			<label class="label">Privacy</label>
			<p class="control">
				<span class="select">
					<select v-model="editing.privacy">
						<option value="public">Public</option>
						<option value="unlisted">Unlisted</option>
						<option value="private">Private</option>
					</select>
				</span>
			</p>
			<br />
			<p class="control" v-if="station.type === 'community'">
				<label class="checkbox party-mode-inner">
					<input v-model="editing.partyMode" type="checkbox" />
					&nbsp;Party mode
				</label>
			</p>
			<small v-if="station.type === 'community'"
				>With party mode enabled, people can add songs to a queue that
				plays. With party mode disabled you can play a private playlist
				on loop.</small
			>
			<br />
			<div v-if="station.type === 'community' && station.partyMode">
				<br />
				<br />
				<label class="label">Queue lock</label>
				<small v-if="station.partyMode"
					>With the queue locked, only owners (you) can add songs to
					the queue.</small
				>
				<br />
				<button
					v-if="!station.locked"
					class="button is-danger"
					@click="$parent.toggleLock()"
				>
					Lock the queue
				</button>
				<button
					v-if="station.locked"
					class="button is-success"
					@click="$parent.toggleLock()"
				>
					Unlock the queue
				</button>
			</div>
			<div
				v-if="station.type === 'official'"
				class="control is-grouped genre-wrapper"
			>
				<div class="sector">
					<p class="control has-addons">
						<input
							id="new-genre-edit"
							class="input"
							type="text"
							placeholder="Genre"
							@keyup.enter="addGenre()"
						/>
						<a class="button is-info" href="#" @click="addGenre()"
							>Add genre</a
						>
					</p>
					<span
						v-for="(genre, index) in editing.genres"
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
							id="new-blacklisted-genre-edit"
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
						v-for="(genre, index) in editing.blacklistedGenres"
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
		</template>
		<template v-slot:footer>
			<button class="button is-success" v-on:click="update()">
				Update Settings
			</button>
			<button
				v-if="station.type === 'community'"
				class="button is-danger"
				@click="deleteStation()"
			>
				Delete station
			</button>
		</template>
	</modal>
</template>

<script>
import { mapState, mapActions } from "vuex";
import { Toast } from "vue-roaster";

import Modal from "../Modals/Modal.vue";
import io from "../../io";
import validation from "../../validation";

export default {
	computed: mapState("admin/stations", {
		station: state => state.station,
		editing: state => state.editing
	}),
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
			return socket;
		});
	},
	methods: {
		update() {
			if (this.station.name !== this.editing.name) this.updateName();
			if (this.station.displayName !== this.editing.displayName)
				this.updateDisplayName();
			if (this.station.description !== this.editing.description)
				this.updateDescription();
			if (this.station.privacy !== this.editing.privacy)
				this.updatePrivacy();
			if (this.station.partyMode !== this.editing.partyMode)
				this.updatePartyMode();
			if (
				this.station.genres.toString() !==
				this.editing.genres.toString()
			)
				this.updateGenres();
			if (
				this.station.blacklistedGenres.toString() !==
				this.editing.blacklistedGenres.toString()
			)
				this.updateBlacklistedGenres();
		},
		updateName() {
			const { name } = this.editing;
			if (!validation.isLength(name, 2, 16))
				return Toast.methods.addToast(
					"Name must have between 2 and 16 characters.",
					8000
				);
			if (!validation.regex.az09_.test(name))
				return Toast.methods.addToast(
					"Invalid name format. Allowed characters: a-z, 0-9 and _.",
					8000
				);

			return this.socket.emit(
				"stations.updateName",
				this.editing._id,
				name,
				res => {
					if (res.status === "success") {
						if (this.station) this.station.name = name;
						this.$parent.stations.forEach((station, index) => {
							if (station._id === this.editing._id) {
								this.$parent.stations[index].name = name;
								return name;
							}

							return false;
						});
					}
					Toast.methods.addToast(res.message, 8000);
				}
			);
		},
		updateDisplayName() {
			const { displayName } = this.editing;
			if (!validation.isLength(displayName, 2, 32))
				return Toast.methods.addToast(
					"Display name must have between 2 and 32 characters.",
					8000
				);
			if (!validation.regex.azAZ09_.test(displayName))
				return Toast.methods.addToast(
					"Invalid display name format. Allowed characters: a-z, A-Z, 0-9 and _.",
					8000
				);

			return this.socket.emit(
				"stations.updateDisplayName",
				this.editing._id,
				displayName,
				res => {
					if (res.status === "success") {
						if (this.station) {
							this.station.displayName = displayName;
							return displayName;
						}
						this.$parent.stations.forEach((station, index) => {
							if (station._id === this.editing._id) {
								this.$parent.stations[
									index
								].displayName = displayName;
								return displayName;
							}

							return false;
						});
					}

					return Toast.methods.addToast(res.message, 8000);
				}
			);
		},
		updateDescription() {
			const { description } = this.editing;
			if (!validation.isLength(description, 2, 200))
				return Toast.methods.addToast(
					"Description must have between 2 and 200 characters.",
					8000
				);
			let characters = description.split("");
			characters = characters.filter(character => {
				return character.charCodeAt(0) === 21328;
			});
			if (characters.length !== 0)
				return Toast.methods.addToast(
					"Invalid description format. Swastika's are not allowed.",
					8000
				);

			return this.socket.emit(
				"stations.updateDescription",
				this.editing._id,
				description,
				res => {
					if (res.status === "success") {
						if (this.station) {
							this.station.description = description;
							return description;
						}
						this.$parent.stations.forEach((station, index) => {
							if (station._id === this.editing._id) {
								this.$parent.stations[
									index
								].description = description;
								return description;
							}

							return false;
						});

						return Toast.methods.addToast(res.message, 4000);
					}

					return Toast.methods.addToast(res.message, 8000);
				}
			);
		},
		updatePrivacy() {
			this.socket.emit(
				"stations.updatePrivacy",
				this.editing._id,
				this.editing.privacy,
				res => {
					if (res.status === "success") {
						if (this.station)
							this.station.privacy = this.editing.privacy;
						else {
							this.$parent.stations.forEach((station, index) => {
								if (station._id === this.editing._id) {
									this.$parent.stations[
										index
									].privacy = this.editing.privacy;
									return this.editing.privacy;
								}

								return false;
							});
						}
						return Toast.methods.addToast(res.message, 4000);
					}

					return Toast.methods.addToast(res.message, 8000);
				}
			);
		},
		updateGenres() {
			this.socket.emit(
				"stations.updateGenres",
				this.editing._id,
				this.editing.genres,
				res => {
					if (res.status === "success") {
						const genres = JSON.parse(
							JSON.stringify(this.editing.genres)
						);
						if (this.station) this.station.genres = genres;
						this.$parent.stations.forEach((station, index) => {
							if (station._id === this.editing._id) {
								this.$parent.stations[index].genres = genres;
								return genres;
							}

							return false;
						});
						return Toast.methods.addToast(res.message, 4000);
					}

					return Toast.methods.addToast(res.message, 8000);
				}
			);
		},
		updateBlacklistedGenres() {
			this.socket.emit(
				"stations.updateBlacklistedGenres",
				this.editing._id,
				this.editing.blacklistedGenres,
				res => {
					if (res.status === "success") {
						const blacklistedGenres = JSON.parse(
							JSON.stringify(this.editing.blacklistedGenres)
						);
						if (this.station)
							this.station.blacklistedGenres = blacklistedGenres;
						this.$parent.stations.forEach((station, index) => {
							if (station._id === this.editing._id) {
								this.$parent.stations[
									index
								].blacklistedGenres = blacklistedGenres;
								return blacklistedGenres;
							}

							return false;
						});
						return Toast.methods.addToast(res.message, 4000);
					}

					return Toast.methods.addToast(res.message, 8000);
				}
			);
		},
		updatePartyMode() {
			this.socket.emit(
				"stations.updatePartyMode",
				this.editing._id,
				this.editing.partyMode,
				res => {
					if (res.status === "success") {
						if (this.station)
							this.station.partyMode = this.editing.partyMode;
						this.$parent.stations.forEach((station, index) => {
							if (station._id === this.editing._id) {
								this.$parent.stations[
									index
								].partyMode = this.editing.partyMode;
								return this.editing.partyMode;
							}

							return false;
						});

						return Toast.methods.addToast(res.message, 4000);
					}

					return Toast.methods.addToast(res.message, 8000);
				}
			);
		},
		addGenre() {
			const genre = document
				.getElementById(`new-genre-edit`)
				.value.toLowerCase()
				.trim();

			if (this.editing.genres.indexOf(genre) !== -1)
				return Toast.methods.addToast("Genre already exists", 3000);
			if (genre) {
				this.editing.genres.push(genre);
				document.getElementById(`new-genre`).value = "";
				return true;
			}
			return Toast.methods.addToast("Genre cannot be empty", 3000);
		},
		removeGenre(index) {
			this.editing.genres.splice(index, 1);
		},
		addBlacklistedGenre() {
			const genre = document
				.getElementById(`new-blacklisted-genre-edit`)
				.value.toLowerCase()
				.trim();
			if (this.editing.blacklistedGenres.indexOf(genre) !== -1)
				return Toast.methods.addToast("Genre already exists", 3000);

			if (genre) {
				this.editing.blacklistedGenres.push(genre);
				document.getElementById(`new-blacklisted-genre`).value = "";
				return true;
			}
			return Toast.methods.addToast("Genre cannot be empty", 3000);
		},
		removeBlacklistedGenre(index) {
			this.editing.blacklistedGenres.splice(index, 1);
		},
		deleteStation() {
			this.socket.emit("stations.remove", this.editing._id, res => {
				if (res.status === "success")
					this.closeModal({
						sector: "station",
						modal: "editStation"
					});
				return Toast.methods.addToast(res.message, 8000);
			});
		},
		...mapActions("modals", ["closeModal"])
	},
	components: { Modal }
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.controls {
	display: flex;

	a {
		display: flex;
		align-items: center;
	}
}

.table {
	margin-bottom: 0;
}

h5 {
	padding: 20px 0;
}

.party-mode-inner,
.party-mode-outer {
	display: flex;
	align-items: center;
}

.select:after {
	border-color: $primary-color;
}
</style>
