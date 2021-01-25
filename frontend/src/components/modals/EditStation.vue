<template>
	<modal title="Edit Station" class="edit-station-modal">
		<template #body>
			<div class="custom-modal-body">
				<!--  Station Preferences -->
				<div class="section left-section">
					<div class="col col-2">
						<div>
							<label class="label">Name</label>
							<p class="control">
								<input
									class="input"
									type="text"
									v-model="editing.name"
								/>
							</p>
						</div>
						<div>
							<label class="label">Display name</label>
							<p class="control">
								<input
									class="input"
									type="text"
									v-model="editing.displayName"
								/>
							</p>
						</div>
					</div>
					<div class="col col-1">
						<div>
							<label class="label">Description</label>
							<p class="control">
								<input
									class="input"
									type="text"
									v-model="editing.description"
								/>
							</p>
						</div>
					</div>
					<div
						class="col col-2"
						v-if="editing.type === 'official' && editing.genres"
					>
						<div>
							<label class="label">Genre(s)</label>
							<p class="control has-addons">
								<input
									class="input"
									type="text"
									id="new-genre"
									v-model="genreInputValue"
									@blur="blurGenreInput()"
									@focus="focusGenreInput()"
									@keydown="keydownGenreInput()"
									@keyup.enter="addTag('genres')"
								/>
								<button
									class="button is-info add-button blue"
									@click="addTag('genres')"
								>
									<i class="material-icons">add</i>
								</button>
							</p>
							<div
								class="autosuggest-container"
								v-if="
									(genreInputFocussed ||
										genreAutosuggestContainerFocussed) &&
										genreAutosuggestItems.length > 0
								"
								@mouseover="focusGenreContainer()"
								@mouseleave="blurGenreContainer()"
							>
								<span
									class="autosuggest-item"
									tabindex="0"
									@click="selectGenreAutosuggest(item)"
									v-for="(item,
									index) in genreAutosuggestItems"
									:key="index"
									>{{ item }}</span
								>
							</div>
							<div class="list-container">
								<div
									class="list-item"
									v-for="(genre, index) in editing.genres"
									:key="index"
								>
									<div
										class="list-item-circle blue"
										@click="removeTag('genres', index)"
									>
										<i class="material-icons">close</i>
									</div>
									<p>{{ genre }}</p>
								</div>
							</div>
						</div>
						<div>
							<label class="label">Blacklist genre(s)</label>
							<p class="control has-addons">
								<input
									class="input"
									type="text"
									v-model="blacklistGenreInputValue"
									@blur="blurBlacklistGenreInput()"
									@focus="focusBlacklistGenreInput()"
									@keydown="keydownBlacklistGenreInput()"
									@keyup.enter="addTag('blacklist-genres')"
								/>
								<button
									class="button is-info add-button red"
									@click="addTag('blacklist-genres')"
								>
									<i class="material-icons">add</i>
								</button>
							</p>
							<div
								class="autosuggest-container"
								v-if="
									(blacklistGenreInputFocussed ||
										blacklistGenreAutosuggestContainerFocussed) &&
										blacklistGenreAutosuggestItems.length >
											0
								"
								@mouseover="focusBlacklistGenreContainer()"
								@mouseleave="blurBlacklistGenreContainer()"
							>
								<span
									class="autosuggest-item"
									tabindex="0"
									@click="
										selectBlacklistGenreAutosuggest(item)
									"
									v-for="(item,
									index) in blacklistGenreAutosuggestItems"
									:key="index"
									>{{ item }}</span
								>
							</div>
							<div class="list-container">
								<div
									class="list-item"
									v-for="(genre,
									index) in editing.blacklistedGenres"
									:key="index"
								>
									<div
										class="list-item-circle red"
										@click="
											removeTag('blacklist-genres', index)
										"
									>
										<i class="material-icons">close</i>
									</div>
									<p>{{ genre }}</p>
								</div>
							</div>
						</div>
					</div>

					<!--  Choose a playlist -->
					<div
						v-if="
							editing.type === 'community' &&
								!editing.partyMode &&
								playlists.length > 0
						"
					>
						<hr style="margin: 10px 0 20px 0" />

						<h4 class="section-title">Choose a playlist</h4>
						<p class="section-description">
							Choose one of your playlists to add to the queue.
						</p>

						<br />

						<div id="playlists">
							<playlist-item
								:playlist="playlist"
								v-for="(playlist, index) in playlists"
								:key="index"
							>
								<div slot="actions">
									<a
										class="button is-danger"
										href="#"
										@click="deselectPlaylist()"
										v-if="isPlaylistSelected(playlist._id)"
									>
										<i
											class="material-icons icon-with-button"
											>stop</i
										>
										Stop playing
									</a>
									<a
										class="button is-success"
										href="#"
										@click="selectPlaylist(playlist._id)"
										v-else
										><i
											class="material-icons icon-with-button"
											>play_arrow</i
										>Play in queue
									</a>
								</div>
							</playlist-item>
						</div>
					</div>
				</div>

				<!--  Buttons changing the privacy settings -->
				<div class="section right-section">
					<div>
						<label class="label">Privacy</label>
						<div
							@mouseenter="privacyDropdownActive = true"
							@mouseleave="privacyDropdownActive = false"
							class="button-wrapper"
						>
							<button
								:class="privacyButtons[editing.privacy].style"
								style="text-transform: capitalize"
								@click="updatePrivacyLocal(editing.privacy)"
							>
								<i class="material-icons">{{
									privacyButtons[editing.privacy].iconName
								}}</i>
								{{ editing.privacy }}
							</button>
							<transition name="slide-down">
								<button
									class="green"
									v-if="
										privacyDropdownActive &&
											editing.privacy !== 'public'
									"
									@click="updatePrivacyLocal('public')"
								>
									<i class="material-icons">{{
										privacyButtons["public"].iconName
									}}</i>
									Public
								</button>
							</transition>
							<transition name="slide-down">
								<button
									class="orange"
									v-if="
										privacyDropdownActive &&
											editing.privacy !== 'unlisted'
									"
									@click="updatePrivacyLocal('unlisted')"
								>
									<i class="material-icons">{{
										privacyButtons["unlisted"].iconName
									}}</i>
									Unlisted
								</button>
							</transition>
							<transition name="slide-down">
								<button
									class="red"
									v-if="
										privacyDropdownActive &&
											editing.privacy !== 'private'
									"
									@click="updatePrivacyLocal('private')"
								>
									<i class="material-icons">{{
										privacyButtons["private"].iconName
									}}</i>
									Private
								</button>
							</transition>
						</div>
					</div>
					<!--  Buttons changing the mode of the station -->
					<div v-if="editing.type === 'community'">
						<label class="label">Mode</label>
						<div
							@mouseenter="modeDropdownActive = true"
							@mouseleave="modeDropdownActive = false"
							class="button-wrapper"
						>
							<button
								:class="{
									blue: !editing.partyMode,
									yellow: editing.partyMode
								}"
								@click="
									editing.partyMode
										? updatePartyModeLocal(true)
										: updatePartyModeLocal(false)
								"
							>
								<i class="material-icons">{{
									editing.partyMode
										? "emoji_people"
										: "playlist_play"
								}}</i>
								{{ editing.partyMode ? "Party" : "Playlist" }}
							</button>
							<transition name="slide-down">
								<button
									class="blue"
									v-if="
										modeDropdownActive && editing.partyMode
									"
									@click="updatePartyModeLocal(false)"
								>
									<i class="material-icons">playlist_play</i>
									Playlist
								</button>
							</transition>
							<transition name="slide-down">
								<button
									class="yellow"
									v-if="
										modeDropdownActive && !editing.partyMode
									"
									@click="updatePartyModeLocal(true)"
								>
									<i class="material-icons">emoji_people</i>
									Party
								</button>
							</transition>
						</div>
					</div>
					<div
						v-if="
							editing.type === 'community' &&
								editing.partyMode === true
						"
					>
						<label class="label">Queue lock</label>
						<div
							@mouseenter="queueLockDropdownActive = true"
							@mouseleave="queueLockDropdownActive = false"
							class="button-wrapper"
						>
							<button
								:class="{
									green: editing.locked,
									red: !editing.locked
								}"
								@click="
									editing.locked
										? updateQueueLockLocal(true)
										: updateQueueLockLocal(false)
								"
							>
								<i class="material-icons">{{
									editing.locked ? "lock" : "lock_open"
								}}</i>
								{{ editing.locked ? "Locked" : "Unlocked" }}
							</button>
							<transition name="slide-down">
								<button
									class="green"
									v-if="
										queueLockDropdownActive &&
											!editing.locked
									"
									@click="updateQueueLockLocal(true)"
								>
									<i class="material-icons">lock</i>
									Locked
								</button>
							</transition>
							<transition name="slide-down">
								<button
									class="red"
									v-if="
										queueLockDropdownActive &&
											editing.locked
									"
									@click="updateQueueLockLocal(false)"
								>
									<i class="material-icons">lock_open</i>
									Unlocked
								</button>
							</transition>
						</div>
					</div>
				</div>
			</div>
		</template>
		<template #footer>
			<button class="button is-success" @click="update()">
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

import Toast from "toasters";

import PlaylistItem from "../ui/PlaylistItem.vue";
import Modal from "../Modal.vue";

import io from "../../io";
import validation from "../../validation";

export default {
	components: { Modal, PlaylistItem },
	props: { store: { type: String, default: "" } },
	data() {
		return {
			genreInputValue: "",
			genreInputFocussed: false,
			genreAutosuggestContainerFocussed: false,
			keydownGenreInputTimeout: 0,
			genreAutosuggestItems: [],
			blacklistGenreInputValue: "",
			blacklistGenreInputFocussed: false,
			blacklistGenreAutosuggestContainerFocussed: false,
			blacklistKeydownGenreInputTimeout: 0,
			blacklistGenreAutosuggestItems: [],
			privacyDropdownActive: false,
			modeDropdownActive: false,
			queueLockDropdownActive: false,
			genres: [
				"Blues",
				"Country",
				"Disco",
				"Funk",
				"Hip-Hop",
				"Jazz",
				"Metal",
				"Oldies",
				"Other",
				"Pop",
				"Rap",
				"Reggae",
				"Rock",
				"Techno",
				"Trance",
				"Classical",
				"Instrumental",
				"House",
				"Electronic",
				"Christian Rap",
				"Lo-Fi",
				"Musical",
				"Rock 'n' Roll",
				"Opera",
				"Drum & Bass",
				"Club-House",
				"Indie",
				"Heavy Metal",
				"Christian rock",
				"Dubstep"
			],
			privacyButtons: {
				public: {
					style: "green",
					iconName: "public"
				},
				private: {
					style: "red",
					iconName: "lock"
				},
				unlisted: {
					style: "orange",
					iconName: "link"
				}
			},
			playlists: []
		};
	},
	computed: {
		...mapState("admin/stations", {
			stations: state => state.stations
		}),
		...mapState({
			editing(state) {
				return this.$props.store
					.split("/")
					.reduce((a, v) => a[v], state).editing;
			},
			station(state) {
				return this.$props.store
					.split("/")
					.reduce((a, v) => a[v], state).station;
			}
		})
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;

			this.socket.emit("playlists.indexForUser", res => {
				if (res.status === "success") this.playlists = res.data;
			});

			this.socket.on("event:playlist.create", playlist => {
				this.playlists.push(playlist);
			});
			this.socket.on("event:playlist.delete", playlistId => {
				this.playlists.forEach((playlist, index) => {
					if (playlist._id === playlistId) {
						this.playlists.splice(index, 1);
					}
				});
			});
			this.socket.on("event:playlist.addSong", data => {
				this.playlists.forEach((playlist, index) => {
					if (playlist._id === data.playlistId) {
						this.playlists[index].songs.push(data.song);
					}
				});
			});
			this.socket.on("event:playlist.removeSong", data => {
				this.playlists.forEach((playlist, index) => {
					if (playlist._id === data.playlistId) {
						this.playlists[index].songs.forEach((song, index2) => {
							if (song.songId === data.songId) {
								this.playlists[index].songs.splice(index2, 1);
							}
						});
					}
				});
			});
			this.socket.on("event:playlist.updateDisplayName", data => {
				this.playlists.forEach((playlist, index) => {
					if (playlist._id === data.playlistId) {
						this.playlists[index].displayName = data.displayName;
					}
				});
			});

			return socket;
		});

		this.editing.genres = JSON.parse(JSON.stringify(this.editing.genres));
		this.editing.blacklistedGenres = JSON.parse(
			JSON.stringify(this.editing.blacklistedGenres)
		);
	},
	methods: {
		isPlaylistSelected(id) {
			// TODO Also change this once it changes for a station
			if (this.station && this.station.privatePlaylist === id)
				return true;
			return false;
		},
		selectPlaylist(playlistId) {
			this.socket.emit(
				"stations.selectPrivatePlaylist",
				this.station._id,
				playlistId,
				res => {
					if (res.status === "failure")
						return new Toast({
							content: res.message,
							timeout: 8000
						});
					return new Toast({ content: res.message, timeout: 4000 });
				}
			);
		},
		deselectPlaylist() {
			this.socket.emit(
				"stations.deselectPrivatePlaylist",
				this.station._id,
				res => {
					if (res.status === "failure")
						return new Toast({
							content: res.message,
							timeout: 8000
						});
					return new Toast({ content: res.message, timeout: 4000 });
				}
			);
		},
		update() {
			if (this.station.name !== this.editing.name) this.updateName();
			if (this.station.displayName !== this.editing.displayName)
				this.updateDisplayName();
			if (this.station.description !== this.editing.description)
				this.updateDescription();
			if (this.station.privacy !== this.editing.privacy)
				this.updatePrivacy();
			if (
				this.station.type === "community" &&
				this.station.partyMode !== this.editing.partyMode
			)
				this.updatePartyMode();
			if (
				this.station.type === "community" &&
				this.editing.partyMode &&
				this.station.locked !== this.editing.locked
			)
				this.updateQueueLock();
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
				return new Toast({
					content: "Name must have between 2 and 16 characters.",
					timeout: 8000
				});
			if (!validation.regex.az09_.test(name))
				return new Toast({
					content:
						"Invalid name format. Allowed characters: a-z, 0-9 and _.",
					timeout: 8000
				});

			return this.socket.emit(
				"stations.updateName",
				this.editing._id,
				name,
				res => {
					if (res.status === "success") {
						if (this.station) this.station.name = name;
						else {
							this.stations.forEach((station, index) => {
								if (station._id === this.editing._id) {
									this.stations[index].name = name;
									return name;
								}

								return false;
							});
						}
					}

					new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		updateDisplayName() {
			const { displayName } = this.editing;
			if (!validation.isLength(displayName, 2, 32))
				return new Toast({
					content:
						"Display name must have between 2 and 32 characters.",
					timeout: 8000
				});
			if (!validation.regex.ascii.test(displayName))
				return new Toast({
					content:
						"Invalid display name format. Only ASCII characters are allowed.",
					timeout: 8000
				});

			return this.socket.emit(
				"stations.updateDisplayName",
				this.editing._id,
				displayName,
				res => {
					if (res.status === "success") {
						if (this.station)
							this.station.displayName = displayName;
						else {
							this.stations.forEach((station, index) => {
								if (station._id === this.editing._id) {
									this.stations[
										index
									].displayName = displayName;
									return displayName;
								}

								return false;
							});
						}
					}

					new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		updateDescription() {
			const { description } = this.editing;
			if (!validation.isLength(description, 2, 200))
				return new Toast({
					content:
						"Description must have between 2 and 200 characters.",
					timeout: 8000
				});

			let characters = description.split("");
			characters = characters.filter(character => {
				return character.charCodeAt(0) === 21328;
			});
			if (characters.length !== 0)
				return new Toast({
					content: "Invalid description format.",
					timeout: 8000
				});

			return this.socket.emit(
				"stations.updateDescription",
				this.editing._id,
				description,
				res => {
					if (res.status === "success") {
						if (this.station)
							this.station.description = description;
						else {
							this.stations.forEach((station, index) => {
								if (station._id === this.editing._id) {
									this.stations[
										index
									].description = description;
									return description;
								}

								return false;
							});
						}

						return new Toast({
							content: res.message,
							timeout: 4000
						});
					}

					return new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		updatePrivacyLocal(privacy) {
			if (this.editing.privacy === privacy) return;
			this.editing.privacy = privacy;
			this.privacyDropdownActive = false;
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
							this.stations.forEach((station, index) => {
								if (station._id === this.editing._id) {
									this.stations[
										index
									].privacy = this.editing.privacy;
									return this.editing.privacy;
								}

								return false;
							});
						}
						return new Toast({
							content: res.message,
							timeout: 4000
						});
					}

					return new Toast({ content: res.message, timeout: 8000 });
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
						this.stations.forEach((station, index) => {
							if (station._id === this.editing._id) {
								this.stations[index].genres = genres;
								return genres;
							}

							return false;
						});

						return new Toast({
							content: res.message,
							timeout: 4000
						});
					}

					return new Toast({ content: res.message, timeout: 8000 });
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
						this.stations.forEach((station, index) => {
							if (station._id === this.editing._id) {
								this.stations[
									index
								].blacklistedGenres = blacklistedGenres;
								return blacklistedGenres;
							}

							return false;
						});
						return new Toast({
							content: res.message,
							timeout: 4000
						});
					}

					return new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		updatePartyModeLocal(partyMode) {
			if (this.editing.partyMode === partyMode) return;
			this.editing.partyMode = partyMode;
			this.modeDropdownActive = false;
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
						// if (this.station)
						// 	this.station.partyMode = this.editing.partyMode;
						// this.stations.forEach((station, index) => {
						// 	if (station._id === this.editing._id) {
						// 		this.stations[
						// 			index
						// 		].partyMode = this.editing.partyMode;
						// 		return this.editing.partyMode;
						// 	}

						// 	return false;
						// });

						return new Toast({
							content: res.message,
							timeout: 4000
						});
					}

					return new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		updateQueueLockLocal(locked) {
			if (this.editing.locked === locked) return;
			this.editing.locked = locked;
			this.queueLockDropdownActive = false;
		},
		updateQueueLock() {
			this.socket.emit("stations.toggleLock", this.editing._id, res => {
				console.log(res);
				if (res.status === "success") {
					if (this.station) this.station.locked = res.data;
					return new Toast({
						content: `Toggled queue lock succesfully to ${res.data}`,
						timeout: 4000
					});
				}
				return new Toast({
					content: "Failed to toggle queue lock.",
					timeout: 8000
				});
			});
		},
		deleteStation() {
			this.socket.emit("stations.remove", this.editing._id, res => {
				if (res.status === "success")
					this.closeModal({
						sector: "station",
						modal: "editStation"
					});
				return new Toast({ content: res.message, timeout: 8000 });
			});
		},
		blurGenreInput() {
			this.genreInputFocussed = false;
		},
		focusGenreInput() {
			this.genreInputFocussed = true;
		},
		keydownGenreInput() {
			clearTimeout(this.keydownGenreInputTimeout);
			this.keydownGenreInputTimeout = setTimeout(() => {
				if (this.genreInputValue.length > 1) {
					this.genreAutosuggestItems = this.genres.filter(genre => {
						return genre
							.toLowerCase()
							.startsWith(this.genreInputValue.toLowerCase());
					});
				} else this.genreAutosuggestItems = [];
			}, 1000);
		},
		focusGenreContainer() {
			this.genreAutosuggestContainerFocussed = true;
		},
		blurGenreContainer() {
			this.genreAutosuggestContainerFocussed = false;
		},
		selectGenreAutosuggest(value) {
			this.genreInputValue = value;
		},
		blurBlacklistGenreInput() {
			this.blacklistGenreInputFocussed = false;
		},
		focusBlacklistGenreInput() {
			this.blacklistGenreInputFocussed = true;
		},
		keydownBlacklistGenreInput() {
			clearTimeout(this.keydownBlacklistGenreInputTimeout);
			this.keydownBlacklistGenreInputTimeout = setTimeout(() => {
				if (this.blacklistGenreInputValue.length > 1) {
					this.blacklistGenreAutosuggestItems = this.genres.filter(
						genre => {
							return genre
								.toLowerCase()
								.startsWith(
									this.blacklistGenreInputValue.toLowerCase()
								);
						}
					);
				} else this.blacklistGenreAutosuggestItems = [];
			}, 1000);
		},
		focusBlacklistGenreContainer() {
			this.blacklistGenreAutosuggestContainerFocussed = true;
		},
		blurBlacklistGenreContainer() {
			this.blacklistGenreAutosuggestContainerFocussed = false;
		},
		selectBlacklistGenreAutosuggest(value) {
			this.blacklistGenreInputValue = value;
		},
		addTag(type) {
			if (type === "genres") {
				const genre = this.genreInputValue.toLowerCase().trim();
				if (this.editing.genres.indexOf(genre) !== -1)
					return new Toast({
						content: "Genre already exists",
						timeout: 3000
					});
				if (genre) {
					this.editing.genres.push(genre);
					this.genreInputValue = "";
					return false;
				}

				return new Toast({
					content: "Genre cannot be empty",
					timeout: 3000
				});
			}
			if (type === "blacklist-genres") {
				const genre = this.blacklistGenreInputValue
					.toLowerCase()
					.trim();
				if (this.editing.blacklistedGenres.indexOf(genre) !== -1)
					return new Toast({
						content: "Blacklist genre already exists",
						timeout: 3000
					});
				if (genre) {
					this.editing.blacklistedGenres.push(genre);
					this.blacklistGenreInputValue = "";
					return false;
				}

				return new Toast({
					content: "Blacklist genre cannot be empty",
					timeout: 3000
				});
			}

			return false;
		},
		removeTag(type, index) {
			if (type === "genres") this.editing.genres.splice(index, 1);
			else if (type === "blacklist-genres")
				this.editing.blacklistedGenres.splice(index, 1);
		},
		...mapActions("modals", ["closeModal"])
	}
};
</script>

<style lang="scss" scoped>
@import "../../styles/global.scss";

.night-mode {
	.modal-card,
	.modal-card-head,
	.modal-card-body,
	.modal-card-foot {
		background-color: $night-mode-bg-secondary;
	}

	.section {
		background-color: $night-mode-bg-secondary !important;
		border: 0 !important;
	}

	.label,
	p,
	strong {
		color: $night-mode-text;
	}
}

.modal-card-title {
	text-align: center;
	margin-left: 24px;
}

.custom-modal-body {
	padding: 16px;
	display: flex;
}

.section {
	border: 1px solid #a3e0ff;
	background-color: #f4f4f4;
	border-radius: 5px;
	padding: 16px;
}

.left-section {
	width: 595px;
	display: grid;
	gap: 16px;
	grid-template-rows: min-content min-content auto;

	.control {
		input {
			width: 100%;
			height: 36px;
		}

		.add-button {
			width: 32px;

			&.blue {
				background-color: $musare-blue !important;
			}

			&.red {
				background-color: $red !important;
			}

			i {
				font-size: 32px;
			}
		}
	}

	.col {
		> div {
			position: relative;
		}
	}

	.list-item-circle {
		width: 16px;
		height: 16px;
		border-radius: 8px;
		cursor: pointer;
		margin-right: 8px;
		float: left;
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		-khtml-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		user-select: none;

		&.blue {
			background-color: $musare-blue;

			i {
				color: $musare-blue;
			}
		}

		&.red {
			background-color: $red;

			i {
				color: $red;
			}
		}

		i {
			font-size: 14px;
			margin-left: 1px;
		}
	}

	.list-item-circle:hover,
	.list-item-circle:focus {
		i {
			color: white;
		}
	}

	.list-item > p {
		line-height: 16px;
		word-wrap: break-word;
		width: calc(100% - 24px);
		left: 24px;
		float: left;
		margin-bottom: 8px;
	}

	.list-item:last-child > p {
		margin-bottom: 0;
	}

	.autosuggest-container {
		position: absolute;
		background: white;
		width: calc(100% + 1px);
		top: 57px;
		z-index: 200;
		overflow: auto;
		max-height: 100%;
		clear: both;

		.autosuggest-item {
			padding: 8px;
			display: block;
			border: 1px solid #dbdbdb;
			margin-top: -1px;
			line-height: 16px;
			cursor: pointer;
			-webkit-user-select: none;
			-ms-user-select: none;
			-moz-user-select: none;
			user-select: none;
		}

		.autosuggest-item:hover,
		.autosuggest-item:focus {
			background-color: #eee;
		}

		.autosuggest-item:first-child {
			border-top: none;
		}

		.autosuggest-item:last-child {
			border-radius: 0 0 3px 3px;
		}
	}
}

.right-section {
	width: 157px;
	min-height: 375px;
	margin-left: 16px;
	display: grid;
	gap: 16px;
	grid-template-rows: min-content min-content min-content;

	.button-wrapper {
		display: flex;
		flex-direction: column;
	}

	button {
		width: 100%;
		height: 36px;
		border: 0;
		border-radius: 3px;
		font-size: 18px;
		color: white;
		box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.25);
		display: block;
		text-align: center;
		justify-content: center;
		display: inline-flex;
		-ms-flex-align: center;
		align-items: center;
		-moz-user-select: none;
		user-select: none;
		cursor: pointer;
		margin-bottom: 10px;
		padding: 0;

		&.red {
			background-color: $red;
		}

		&.green {
			background-color: $green;
		}

		&.blue {
			background-color: $musare-blue;
		}

		&.orange {
			background-color: $light-orange;
		}

		&.yellow {
			background-color: $yellow;
		}

		i {
			font-size: 20px;
			margin-right: 4px;
		}
	}
}

.col {
	display: grid;
	grid-column-gap: 16px;
}

.col-1 {
	grid-template-columns: auto;
}

.col-2 {
	grid-template-columns: auto auto;
}

.slide-down-enter-active {
	transition: transform 0.25s;
}

.slide-down-enter {
	transform: translateY(-10px);
}

#playlists {
	overflow: auto;

	.playlist:not(:last-of-type) {
		margin-bottom: 10px;
	}

	.button {
		width: 148px;
	}
}

.modal-card {
	overflow: auto;
}

.modal-card-body {
	overflow: unset;
}
</style>
