<template>
	<modal title="Edit Station" class="edit-station-modal">
		<template #body>
			<div class="custom-modal-body" v-if="station && station._id">
				<!--  Station Preferences -->
				<div class="section left-section">
					<div class="col col-2">
						<div>
							<label class="label">Name</label>
							<p class="control">
								<input
									class="input"
									type="text"
									v-model="station.name"
								/>
							</p>
						</div>
						<div>
							<label class="label">Display name</label>
							<p class="control">
								<input
									class="input"
									type="text"
									v-model="station.displayName"
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
									v-model="station.description"
								/>
							</p>
						</div>
					</div>
					<div
						class="col col-2"
						v-if="station.type === 'official' && station.genres"
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
									v-for="(genre, index) in station.genres"
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
									index) in station.blacklistedGenres"
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
								:class="privacyButtons[station.privacy].style"
								@click="updatePrivacyLocal(station.privacy)"
							>
								<i class="material-icons">{{
									privacyButtons[station.privacy].iconName
								}}</i>
								{{ station.privacy }}
							</button>
							<transition name="slide-down">
								<button
									class="green"
									v-if="
										privacyDropdownActive &&
											station.privacy !== 'public'
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
											station.privacy !== 'unlisted'
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
											station.privacy !== 'private'
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
					<div>
						<label class="label">Station Mode</label>
						<div
							@mouseenter="modeDropdownActive = true"
							@mouseleave="modeDropdownActive = false"
							class="button-wrapper"
						>
							<button
								:class="{
									blue: !station.partyMode,
									yellow: station.partyMode
								}"
								@click="
									station.partyMode
										? updatePartyModeLocal(true)
										: updatePartyModeLocal(false)
								"
							>
								<i class="material-icons">{{
									station.partyMode
										? "emoji_people"
										: "playlist_play"
								}}</i>
								{{ station.partyMode ? "Party" : "Playlist" }}
							</button>
							<transition name="slide-down">
								<button
									class="blue"
									v-if="
										modeDropdownActive && station.partyMode
									"
									@click="updatePartyModeLocal(false)"
								>
									<i class="material-icons">playlist_play</i>
									Playlist
								</button>
							</transition>
							<transition
								v-if="station.type === 'community'"
								name="slide-down"
							>
								<button
									class="yellow"
									v-if="
										modeDropdownActive && !station.partyMode
									"
									@click="updatePartyModeLocal(true)"
								>
									<i class="material-icons">emoji_people</i>
									Party
								</button>
							</transition>
						</div>
					</div>
					<div>
						<label class="label">Play Mode</label>
						<div
							@mouseenter="playModeDropdownActive = true"
							@mouseleave="playModeDropdownActive = false"
							class="button-wrapper"
						>
							<button
								class="blue"
								@click="
									(station.type === 'official' &&
										station.playMode === 'random') ||
									station.playMode === 'sequential'
										? updatePlayModeLocal('random')
										: updatePlayModeLocal('sequential')
								"
							>
								<i class="material-icons">{{
									station.playMode === "random"
										? "shuffle"
										: "format_list_numbered"
								}}</i>
								{{
									station.playMode === "random"
										? "Random"
										: "Sequential"
								}}
							</button>
							<transition name="slide-down">
								<button
									class="blue"
									v-if="
										playModeDropdownActive &&
											station.playMode === 'sequential'
									"
									@click="updatePlayModeLocal('random')"
								>
									<i class="material-icons">shuffle</i>
									Random
								</button>
							</transition>
							<transition
								v-if="station.type === 'community'"
								name="slide-down"
							>
								<button
									class="blue"
									v-if="
										playModeDropdownActive &&
											station.playMode === 'random'
									"
									@click="updatePlayModeLocal('sequential')"
								>
									<i class="material-icons"
										>format_list_numbered</i
									>
									Sequential
								</button>
							</transition>
						</div>
					</div>
					<div
						v-if="
							station.type === 'community' &&
								station.partyMode === true
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
									green: station.locked,
									red: !station.locked
								}"
								@click="
									station.locked
										? updateQueueLockLocal(true)
										: updateQueueLockLocal(false)
								"
							>
								<i class="material-icons">{{
									station.locked ? "lock" : "lock_open"
								}}</i>
								{{ station.locked ? "Locked" : "Unlocked" }}
							</button>
							<transition name="slide-down">
								<button
									class="green"
									v-if="
										queueLockDropdownActive &&
											!station.locked
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
											station.locked
									"
									@click="updateQueueLockLocal(false)"
								>
									<i class="material-icons">lock_open</i>
									Unlocked
								</button>
							</transition>
						</div>
					</div>
					<div>
						<label class="label">Theme</label>
						<div
							@mouseenter="themeDropdownActive = true"
							@mouseleave="themeDropdownActive = false"
							class="button-wrapper"
						>
							<button
								:class="station.theme"
								@click="updateThemeLocal(station.theme)"
							>
								<i class="material-icons">palette</i>
								{{ station.theme }}
							</button>
							<transition name="slide-down">
								<button
									class="blue"
									v-if="
										themeDropdownActive &&
											station.theme !== 'blue'
									"
									@click="updateThemeLocal('blue')"
								>
									<i class="material-icons">palette</i>
									Blue
								</button>
							</transition>
							<transition name="slide-down">
								<button
									class="purple"
									v-if="
										themeDropdownActive &&
											station.theme !== 'purple'
									"
									@click="updateThemeLocal('purple')"
								>
									<i class="material-icons">palette</i>
									Purple
								</button>
							</transition>
							<transition name="slide-down">
								<button
									class="teal"
									v-if="
										themeDropdownActive &&
											station.theme !== 'teal'
									"
									@click="updateThemeLocal('teal')"
								>
									<i class="material-icons">palette</i>
									Teal
								</button>
							</transition>
							<transition name="slide-down">
								<button
									class="orange"
									v-if="
										themeDropdownActive &&
											station.theme !== 'orange'
									"
									@click="updateThemeLocal('orange')"
								>
									<i class="material-icons">palette</i>
									Orange
								</button>
							</transition>
						</div>
					</div>
				</div>
			</div>
		</template>
		<template #footer>
			<save-button ref="saveButton" @clicked="saveChanges()" />
			<div class="right">
				<confirm @confirm="clearAndRefillStationQueue()">
					<a class="button is-danger">
						Clear and refill station queue
					</a>
				</confirm>
				<confirm
					v-if="station && station.type === 'community'"
					@confirm="deleteStation()"
				>
					<button class="button is-danger">Delete station</button>
				</confirm>
			</div>
		</template>
	</modal>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";

import Toast from "toasters";

import validation from "@/validation";
import Confirm from "@/components/Confirm.vue";
import Modal from "../Modal.vue";
import SaveButton from "../SaveButton.vue";

export default {
	components: { Modal, Confirm, SaveButton },
	props: {
		stationId: { type: String, default: "" },
		sector: { type: String, default: "admin" }
	},
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
			playModeDropdownActive: false,
			queueLockDropdownActive: false,
			themeDropdownActive: false,
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
			}
		};
	},
	computed: {
		// ...mapState("admin/stations", {
		// 	stations: state => state.stations
		// }),
		...mapState("modals/editStation", {
			station: state => state.station,
			originalStation: state => state.originalStation
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.socket.dispatch(`stations.getStationById`, this.stationId, res => {
			if (res.status === "success") {
				const { station } = res.data;
				// this.song = { ...song };
				// if (this.song.discogs === undefined)
				// 	this.song.discogs = null;
				this.editStation(station);

				// this.songDataLoaded = true;

				this.socket.dispatch(
					`stations.getStationIncludedPlaylistsById`,
					this.stationId,
					res => {
						if (res.status === "success") {
							this.setGenres(
								res.data.playlists.map(playlist => {
									if (playlist) {
										if (playlist.type === "genre")
											return playlist.createdFor;
										return `Playlist: ${playlist.name}`;
									}
									return "Unknown/Error";
								})
							);
							this.originalStation.genres = JSON.parse(
								JSON.stringify(this.station.genres)
							);
						}
					}
				);

				this.socket.dispatch(
					`stations.getStationExcludedPlaylistsById`,
					this.stationId,
					res => {
						if (res.status === "success") {
							this.setBlacklistedGenres(
								res.data.playlists.map(playlist => {
									if (playlist) {
										if (playlist.type === "genre")
											return playlist.createdFor;
										return `Playlist: ${playlist.name}`;
									}
									return "Unknown/Error";
								})
							);
							this.originalStation.blacklistedGenres = JSON.parse(
								JSON.stringify(this.station.blacklistedGenres)
							);
						}
					}
				);

				// this.station.genres = JSON.parse(
				// 	JSON.stringify(this.station.genres)
				// );
				// this.station.blacklistedGenres = JSON.parse(
				// 	JSON.stringify(this.station.blacklistedGenres)
				// );
			} else {
				new Toast("Station with that ID not found");
				this.closeModal({
					sector: this.sector,
					modal: "editStation"
				});
			}
		});
	},
	beforeDestroy() {
		this.clearStation();
	},
	methods: {
		saveChanges() {
			const nameChanged = this.originalStation.name !== this.station.name;
			const displayNameChanged =
				this.originalStation.displayName !== this.station.displayName;
			const descriptionChanged =
				this.originalStation.description !== this.station.description;
			const privacyChanged =
				this.originalStation.privacy !== this.station.privacy;
			const partyModeChanged =
				this.originalStation.type === "community" &&
				this.originalStation.partyMode !== this.station.partyMode;
			const playModeChanged =
				this.originalStation.playMode !== this.station.playMode;
			const queueLockChanged =
				this.originalStation.type === "community" &&
				this.station.partyMode &&
				this.originalStation.locked !== this.station.locked;
			const genresChanged =
				this.originalStation.genres.toString() !==
				this.station.genres.toString();
			const blacklistedGenresChanged =
				this.originalStation.blacklistedGenres.toString() !==
				this.station.blacklistedGenres.toString();
			const themeChanged =
				this.originalStation.theme !== this.station.theme;

			if (nameChanged) this.updateName();
			if (displayNameChanged) this.updateDisplayName();
			if (descriptionChanged) this.updateDescription();
			if (privacyChanged) this.updatePrivacy();
			if (partyModeChanged) this.updatePartyMode();
			if (playModeChanged) this.updatePlayMode();
			if (queueLockChanged) this.updateQueueLock();
			if (genresChanged) this.updateGenres();
			if (blacklistedGenresChanged) this.updateBlacklistedGenres();
			if (themeChanged) this.updateTheme();

			if (
				!nameChanged &&
				!displayNameChanged &&
				!descriptionChanged &&
				!privacyChanged &&
				!partyModeChanged &&
				!playModeChanged &&
				!queueLockChanged &&
				!genresChanged &&
				!blacklistedGenresChanged &&
				!themeChanged
			) {
				this.$refs.saveButton.handleFailedSave();

				new Toast("Please make a change before saving.");
			}
		},
		updateName() {
			const { name } = this.station;
			if (!validation.isLength(name, 2, 16))
				return new Toast("Name must have between 2 and 16 characters.");
			if (!validation.regex.az09_.test(name))
				return new Toast(
					"Invalid name format. Allowed characters: a-z, 0-9 and _."
				);

			this.$refs.saveButton.status = "disabled";

			return this.socket.dispatch(
				"stations.updateName",
				this.station._id,
				name,
				res => {
					new Toast(res.message);

					if (res.status === "success") {
						this.originalStation.name = name;
						return this.$refs.saveButton.handleSuccessfulSave();
					}

					return this.$refs.saveButton.handleFailedSave();
				}
			);
		},
		updateDisplayName() {
			const { displayName } = this.station;

			if (!validation.isLength(displayName, 2, 32))
				return new Toast(
					"Display name must have between 2 and 32 characters."
				);

			if (!validation.regex.ascii.test(displayName))
				return new Toast(
					"Invalid display name format. Only ASCII characters are allowed."
				);

			this.$refs.saveButton.status = "disabled";

			return this.socket.dispatch(
				"stations.updateDisplayName",
				this.station._id,
				displayName,
				res => {
					new Toast(res.message);

					if (res.status === "success") {
						this.originalStation.displayName = displayName;
						return this.$refs.saveButton.handleSuccessfulSave();
					}

					return this.$refs.saveButton.handleFailedSave();
				}
			);
		},
		updateDescription() {
			const { description } = this.station;
			if (!validation.isLength(description, 2, 200))
				return new Toast(
					"Description must have between 2 and 200 characters."
				);

			let characters = description.split("");
			characters = characters.filter(character => {
				return character.charCodeAt(0) === 21328;
			});
			if (characters.length !== 0)
				return new Toast("Invalid description format.");

			this.$refs.saveButton.status = "disabled";

			return this.socket.dispatch(
				"stations.updateDescription",
				this.station._id,
				description,
				res => {
					new Toast(res.message);

					if (res.status === "success") {
						this.originalStation.description = description;
						return this.$refs.saveButton.handleSuccessfulSave();
					}

					return this.$refs.saveButton.handleFailedSave();
				}
			);
		},
		updatePrivacyLocal(privacy) {
			if (this.station.privacy === privacy) return;
			this.station.privacy = privacy;
			this.privacyDropdownActive = false;
		},
		updatePrivacy() {
			this.$refs.saveButton.status = "disabled";

			this.socket.dispatch(
				"stations.updatePrivacy",
				this.station._id,
				this.station.privacy,
				res => {
					new Toast(res.message);

					if (res.status === "success") {
						this.originalStation.privacy = this.station.privacy;
						return this.$refs.saveButton.handleSuccessfulSave();
					}

					return this.$refs.saveButton.handleFailedSave();
				}
			);
		},
		updateGenres() {
			this.$refs.saveButton.status = "disabled";

			this.socket.dispatch(
				"stations.updateGenres",
				this.station._id,
				this.station.genres,
				res => {
					new Toast(res.message);

					if (res.status === "success") {
						const genres = JSON.parse(
							JSON.stringify(this.station.genres)
						);

						if (this.originalStation)
							this.originalStation.genres = genres;

						return this.$refs.saveButton.handleSuccessfulSave();
					}

					return this.$refs.saveButton.handleFailedSave();
				}
			);
		},
		updateBlacklistedGenres() {
			this.$refs.saveButton.status = "disabled";

			this.socket.dispatch(
				"stations.updateBlacklistedGenres",
				this.station._id,
				this.station.blacklistedGenres,
				res => {
					new Toast(res.message);

					if (res.status === "success") {
						const blacklistedGenres = JSON.parse(
							JSON.stringify(this.station.blacklistedGenres)
						);

						this.originalStation.blacklistedGenres = blacklistedGenres;

						return this.$refs.saveButton.handleSuccessfulSave();
					}

					return this.$refs.saveButton.handleFailedSave();
				}
			);
		},
		updatePartyModeLocal(partyMode) {
			if (this.station.partyMode === partyMode) return;
			this.station.partyMode = partyMode;
			this.modeDropdownActive = false;
		},
		updatePartyMode() {
			this.$refs.saveButton.status = "disabled";

			this.socket.dispatch(
				"stations.updatePartyMode",
				this.station._id,
				this.station.partyMode,
				res => {
					new Toast(res.message);

					if (res.status === "success") {
						this.originalStation.partyMode = this.station.partyMode;
						return this.$refs.saveButton.handleSuccessfulSave();
					}

					return this.$refs.saveButton.handleFailedSave();
				}
			);
		},
		updatePlayModeLocal(playMode) {
			if (this.station.playMode === playMode) return;
			this.station.playMode = playMode;
			this.playModeDropdownActive = false;
		},
		updatePlayMode() {
			this.$refs.saveButton.status = "disabled";

			this.socket.dispatch(
				"stations.updatePlayMode",
				this.station._id,
				this.station.playMode,
				res => {
					new Toast(res.message);

					if (res.status === "success") {
						this.originalStation.playMode = this.station.playMode;
						return this.$refs.saveButton.handleSuccessfulSave();
					}

					return this.$refs.saveButton.handleFailedSave();
				}
			);
		},
		updateQueueLockLocal(locked) {
			if (this.station.locked === locked) return;
			this.station.locked = locked;
			this.queueLockDropdownActive = false;
		},
		updateQueueLock() {
			this.$refs.saveButton.status = "disabled";

			this.socket.dispatch(
				"stations.toggleLock",
				this.station._id,
				res => {
					if (res.status === "success") {
						if (this.originalStation)
							this.originalStation.locked = res.data.locked;

						new Toast(
							`Toggled queue lock successfully to ${res.data.locked}`
						);

						return this.$refs.saveButton.handleSuccessfulSave();
					}

					new Toast("Failed to toggle queue lock.");

					return this.$refs.saveButton.handleFailedSave();
				}
			);
		},
		updateThemeLocal(theme) {
			if (this.station.theme === theme) return;
			this.station.theme = theme;
			this.themeDropdownActive = false;
		},
		updateTheme() {
			this.$refs.saveButton.status = "disabled";

			this.socket.dispatch(
				"stations.updateTheme",
				this.station._id,
				this.station.theme,
				res => {
					new Toast(res.message);

					if (res.status === "success") {
						this.originalStation.theme = this.station.theme;
						return this.$refs.saveButton.handleSuccessfulSave();
					}

					return this.$refs.saveButton.handleFailedSave();
				}
			);
		},
		deleteStation() {
			this.socket.dispatch("stations.remove", this.station._id, res => {
				if (res.status === "success")
					this.closeModal({
						sector: "station",
						modal: "editStation"
					});
				return new Toast(res.message);
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
				if (this.station.genres.indexOf(genre) !== -1)
					return new Toast("Genre already exists");
				if (genre) {
					this.station.genres.push(genre);
					this.genreInputValue = "";
					return false;
				}

				return new Toast("Genre cannot be empty");
			}
			if (type === "blacklist-genres") {
				const genre = this.blacklistGenreInputValue
					.toLowerCase()
					.trim();
				if (this.station.blacklistedGenres.indexOf(genre) !== -1)
					return new Toast("Blacklist genre already exists");
				if (genre) {
					this.station.blacklistedGenres.push(genre);
					this.blacklistGenreInputValue = "";
					return false;
				}

				return new Toast("Blacklist genre cannot be empty");
			}

			return false;
		},
		removeTag(type, index) {
			if (type === "genres") this.station.genres.splice(index, 1);
			else if (type === "blacklist-genres")
				this.station.blacklistedGenres.splice(index, 1);
		},
		clearAndRefillStationQueue() {
			this.socket.dispatch(
				"stations.clearAndRefillStationQueue",
				this.station._id,
				res => {
					if (res.status !== "success")
						new Toast({
							content: `Error: ${res.message}`,
							timeout: 8000
						});
					else new Toast({ content: res.message, timeout: 4000 });
				}
			);
		},
		...mapActions("modals/editStation", [
			"editStation",
			"setGenres",
			"setBlacklistedGenres",
			"clearStation"
		]),
		...mapActions("modalVisibility", ["closeModal"])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.modal-card,
	.modal-card-head,
	.modal-card-body,
	.modal-card-foot {
		background-color: var(--dark-grey-3);
	}

	.section {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;
	}

	.label,
	p,
	strong {
		color: var(--light-grey-2);
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
	border: 1px solid var(--light-blue);
	background-color: var(--light-grey);
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
				background-color: var(--primary-color) !important;
			}

			&.red {
				background-color: var(--red) !important;
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
			background-color: var(--primary-color);

			i {
				color: var(--primary-color);
			}
		}

		&.red {
			background-color: var(--red);

			i {
				color: var(--red);
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
			color: var(--white);
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
		background: var(--white);
		width: calc(100% + 1px);
		top: 57px;
		z-index: 200;
		overflow: auto;
		max-height: 100%;
		clear: both;

		.autosuggest-item {
			padding: 8px;
			display: block;
			border: 1px solid var(--light-grey-2);
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
			background-color: var(--light-grey);
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
	min-height: 515px;
	margin-left: 16px;
	display: grid;
	gap: 16px;
	grid-template-rows: min-content min-content min-content;

	.button-wrapper {
		display: flex;
		flex-direction: column;

		button {
			width: 100%;
			height: 36px;
			border: 0;
			border-radius: 3px;
			font-size: 18px;
			color: var(--white);
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
			text-transform: capitalize;

			&.red {
				background-color: var(--red);
			}

			&.green {
				background-color: var(--green);
			}

			&.blue {
				background-color: var(--blue);
			}

			&.orange {
				background-color: var(--orange);
			}

			&.yellow {
				background-color: var(--yellow);
			}

			&.purple {
				background-color: var(--purple);
			}

			&.teal {
				background-color: var(--teal);
			}

			i {
				font-size: 20px;
				margin-right: 4px;
			}
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

.modal-card {
	overflow: auto;
}

.modal-card-body {
	overflow: unset;
}
</style>
