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
					<div v-if="station.type === 'community'">
						<label class="label">Mode</label>
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
							<transition name="slide-down">
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

import Modal from "../Modal.vue";

import io from "../../io";
import validation from "../../validation";

export default {
	components: { Modal },
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
		})
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;

			this.socket.emit(`stations.getStationById`, this.stationId, res => {
				if (res.status === "success") {
					const { station } = res;
					// this.song = { ...song };
					// if (this.song.discogs === undefined)
					// 	this.song.discogs = null;
					this.editStation(station);

					// this.songDataLoaded = true;

					this.station.genres = JSON.parse(
						JSON.stringify(this.station.genres)
					);
					this.station.blacklistedGenres = JSON.parse(
						JSON.stringify(this.station.blacklistedGenres)
					);
				} else {
					new Toast({
						content: "Station with that ID not found",
						timeout: 3000
					});
					this.closeModal({
						sector: this.sector,
						modal: "editStation"
					});
				}
			});

			return socket;
		});
	},
	methods: {
		update() {
			if (this.originalStation.name !== this.station.name)
				this.updateName();
			if (this.originalStation.displayName !== this.station.displayName)
				this.updateDisplayName();
			if (this.originalStation.description !== this.station.description)
				this.updateDescription();
			if (this.originalStation.privacy !== this.station.privacy)
				this.updatePrivacy();
			if (
				this.originalStation.type === "community" &&
				this.originalStation.partyMode !== this.station.partyMode
			)
				this.updatePartyMode();
			if (
				this.originalStation.type === "community" &&
				this.station.partyMode &&
				this.originalStation.locked !== this.station.locked
			)
				this.updateQueueLock();
			if (
				this.originalStation.genres.toString() !==
				this.station.genres.toString()
			)
				this.updateGenres();
			if (
				this.originalStation.blacklistedGenres.toString() !==
				this.station.blacklistedGenres.toString()
			)
				this.updateBlacklistedGenres();
			if (this.originalStation.theme !== this.station.theme)
				this.updateTheme();
		},
		updateName() {
			const { name } = this.station;
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
				this.station._id,
				name,
				res => {
					if (res.status === "success")
						this.originalStation.name = name;

					new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		updateDisplayName() {
			const { displayName } = this.station;
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
				this.station._id,
				displayName,
				res => {
					if (res.status === "success")
						this.originalStation.displayName = displayName;

					new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		updateDescription() {
			const { description } = this.station;
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
				this.station._id,
				description,
				res => {
					if (res.status === "success")
						this.originalStation.description = description;

					return new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		updatePrivacyLocal(privacy) {
			if (this.station.privacy === privacy) return;
			this.station.privacy = privacy;
			this.privacyDropdownActive = false;
		},
		updatePrivacy() {
			this.socket.emit(
				"stations.updatePrivacy",
				this.station._id,
				this.station.privacy,
				res => {
					if (res.status === "success")
						this.originalStation.privacy = this.station.privacy;

					return new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		updateGenres() {
			this.socket.emit(
				"stations.updateGenres",
				this.station._id,
				this.station.genres,
				res => {
					console.log(res);
					if (res.status === "success") {
						const genres = JSON.parse(
							JSON.stringify(this.station.genres)
						);
						if (this.originalStation)
							this.originalStation.genres = genres;

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
				this.station._id,
				this.station.blacklistedGenres,
				res => {
					if (res.status === "success") {
						const blacklistedGenres = JSON.parse(
							JSON.stringify(this.station.blacklistedGenres)
						);

						this.originalStation.blacklistedGenres = blacklistedGenres;
					}

					return new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		updatePartyModeLocal(partyMode) {
			if (this.station.partyMode === partyMode) return;
			this.station.partyMode = partyMode;
			this.modeDropdownActive = false;
		},
		updatePartyMode() {
			this.socket.emit(
				"stations.updatePartyMode",
				this.station._id,
				this.station.partyMode,
				res => {
					if (res.status === "success")
						this.originalStation.partyMode = this.station.partyMode;

					return new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		updateQueueLockLocal(locked) {
			if (this.station.locked === locked) return;
			this.station.locked = locked;
			this.queueLockDropdownActive = false;
		},
		updateQueueLock() {
			this.socket.emit("stations.toggleLock", this.station._id, res => {
				console.log(res);
				if (res.status === "success") {
					if (this.originalStation)
						this.originalStation.locked = res.data;
					return new Toast({
						content: `Toggled queue lock successfully to ${res.data}`,
						timeout: 4000
					});
				}
				return new Toast({
					content: "Failed to toggle queue lock.",
					timeout: 8000
				});
			});
		},
		updateThemeLocal(theme) {
			if (this.station.theme === theme) return;
			this.station.theme = theme;
			this.themeDropdownActive = false;
		},
		updateTheme() {
			this.socket.emit(
				"stations.updateTheme",
				this.station._id,
				this.station.theme,
				res => {
					if (res.status === "success")
						this.originalStation.theme = this.station.theme;

					return new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		deleteStation() {
			this.socket.emit("stations.remove", this.station._id, res => {
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
				if (this.station.genres.indexOf(genre) !== -1)
					return new Toast({
						content: "Genre already exists",
						timeout: 3000
					});
				if (genre) {
					this.station.genres.push(genre);
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
				if (this.station.blacklistedGenres.indexOf(genre) !== -1)
					return new Toast({
						content: "Blacklist genre already exists",
						timeout: 3000
					});
				if (genre) {
					this.station.blacklistedGenres.push(genre);
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
			if (type === "genres") this.station.genres.splice(index, 1);
			else if (type === "blacklist-genres")
				this.station.blacklistedGenres.splice(index, 1);
		},
		...mapActions("modals/editStation", ["editStation"]),
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
				background-color: var(--primary-color);
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
