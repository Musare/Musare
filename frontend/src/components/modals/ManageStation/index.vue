<template>
	<modal
		v-if="station"
		:title="
			!isOwnerOrAdmin() && station.partyMode
				? 'Add Song to Queue'
				: 'Manage Station'
		"
		:style="`--primary-color: var(--${station.theme})`"
		class="manage-station-modal"
	>
		<template #body>
			<div class="custom-modal-body" v-if="station && station._id">
				<div class="left-section">
					<div class="section">
						<div id="about-station-container">
							<div id="station-info">
								<div id="station-name">
									<h1>{{ station.displayName }}</h1>
									<i
										v-if="station.type === 'official'"
										class="material-icons verified-station"
										content="Verified Station"
										v-tippy
									>
										check_circle
									</i>
									<i
										class="material-icons stationMode"
										:content="
											station.partyMode
												? 'Station in Party mode'
												: 'Station in Playlist mode'
										"
										v-tippy
										>{{
											station.partyMode
												? "emoji_people"
												: "playlist_play"
										}}</i
									>
								</div>
								<p>{{ station.description }}</p>
							</div>

							<div id="admin-buttons" v-if="isOwnerOrAdmin()">
								<!-- (Admin) Pause/Resume Button -->
								<button
									class="button is-danger"
									v-if="stationPaused"
									@click="resumeStation()"
								>
									<i class="material-icons icon-with-button"
										>play_arrow</i
									>
									<span> Resume Station </span>
								</button>
								<button
									class="button is-danger"
									@click="pauseStation()"
									v-else
								>
									<i class="material-icons icon-with-button"
										>pause</i
									>
									<span> Pause Station </span>
								</button>

								<!-- (Admin) Skip Button -->
								<button
									class="button is-danger"
									@click="skipStation()"
								>
									<i class="material-icons icon-with-button"
										>skip_next</i
									>
									<span> Force Skip </span>
								</button>

								<router-link
									v-if="sector !== 'station' && station.name"
									:to="{
										name: 'station',
										params: { id: station.name }
									}"
									class="button is-primary"
								>
									Go To Station
								</router-link>
							</div>
						</div>
						<div class="tab-selection">
							<button
								v-if="isOwnerOrAdmin()"
								class="button is-default"
								:class="{ selected: tab === 'settings' }"
								ref="settings-tab"
								@click="showTab('settings')"
							>
								Settings
							</button>
							<button
								v-if="isAllowedToParty() || isOwnerOrAdmin()"
								class="button is-default"
								:class="{ selected: tab === 'playlists' }"
								ref="playlists-tab"
								@click="showTab('playlists')"
							>
								Playlists
							</button>
							<button
								v-if="isAllowedToParty() || isOwnerOrAdmin()"
								class="button is-default"
								:class="{ selected: tab === 'songs' }"
								ref="songs-tab"
								@click="showTab('songs')"
							>
								Songs
							</button>
						</div>
						<settings
							v-if="isOwnerOrAdmin()"
							class="tab"
							v-show="tab === 'settings'"
						/>
						<playlists
							v-if="isAllowedToParty() || isOwnerOrAdmin()"
							class="tab"
							v-show="tab === 'playlists'"
						/>
						<songs
							v-if="isAllowedToParty() || isOwnerOrAdmin()"
							class="tab"
							v-show="tab === 'songs'"
						/>
					</div>
				</div>
				<div class="right-section">
					<div class="section">
						<div class="queue-title">
							<h4 class="section-title">Queue</h4>
						</div>
						<hr class="section-horizontal-rule" />
						<song-item
							v-if="currentSong._id"
							:song="currentSong"
							:requested-by="
								station.type === 'community' &&
								station.partyMode === true
							"
							header="Currently Playing.."
							class="currently-playing"
						/>
						<queue sector="manageStation" />
					</div>
				</div>
			</div>
		</template>
		<template #footer>
			<button
				class="button is-primary tab-actionable-button"
				v-if="loggedIn && station.type === 'official'"
				@click="openModal('requestSong')"
			>
				<i class="material-icons icon-with-button">queue</i>
				<span> Request Song </span>
			</button>
			<div v-if="isOwnerOrAdmin()" class="right">
				<confirm @confirm="clearAndRefillStationQueue()">
					<a class="button is-danger">
						Clear and refill station queue
					</a>
				</confirm>
				<confirm
					v-if="station && station.type === 'community'"
					@confirm="removeStation()"
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

import Confirm from "@/components/Confirm.vue";
import Queue from "@/components/Queue.vue";
import SongItem from "@/components/SongItem.vue";
import Modal from "../../Modal.vue";

import Settings from "./Tabs/Settings.vue";
import Playlists from "./Tabs/Playlists.vue";
import Songs from "./Tabs/Songs.vue";

export default {
	components: {
		Modal,
		Confirm,
		Queue,
		SongItem,
		Settings,
		Playlists,
		Songs
	},
	props: {
		stationId: { type: String, default: "" },
		sector: { type: String, default: "admin" }
	},
	computed: {
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			userId: state => state.user.auth.userId,
			role: state => state.user.auth.role
		}),
		...mapState("modals/manageStation", {
			tab: state => state.tab,
			station: state => state.station,
			originalStation: state => state.originalStation,
			songsList: state => state.songsList,
			stationPlaylist: state => state.stationPlaylist,
			includedPlaylists: state => state.includedPlaylists,
			excludedPlaylists: state => state.excludedPlaylists,
			stationPaused: state => state.stationPaused,
			currentSong: state => state.currentSong
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.socket.dispatch(`stations.getStationById`, this.stationId, res => {
			if (res.status === "success") {
				const { station } = res.data;
				this.editStation(station);

				if (!this.isOwnerOrAdmin() && this.station.partyMode)
					this.showTab("songs");

				const currentSong = res.data.station.currentSong
					? res.data.station.currentSong
					: {};

				this.updateCurrentSong(currentSong);

				this.updateStationPaused(res.data.station.paused);

				this.socket.dispatch(
					"stations.getStationIncludedPlaylistsById",
					this.stationId,
					res => {
						if (res.status === "success")
							this.setIncludedPlaylists(res.data.playlists);
					}
				);

				this.socket.dispatch(
					"stations.getStationExcludedPlaylistsById",
					this.stationId,
					res => {
						if (res.status === "success")
							this.setExcludedPlaylists(res.data.playlists);
					}
				);

				if (this.isOwnerOrAdmin()) {
					this.socket.dispatch(
						"playlists.getPlaylistForStation",
						this.station._id,
						true,
						res => {
							if (res.status === "success") {
								this.updateStationPlaylist(res.data.playlist);
							}
						}
					);
				}

				this.socket.dispatch(
					"stations.getQueue",
					this.stationId,
					res => {
						if (res.status === "success")
							this.updateSongsList(res.data.queue);
					}
				);

				this.socket.dispatch(
					"apis.joinRoom",
					`manage-station.${this.stationId}`
				);

				this.socket.on(
					"event:station.name.updated",
					res => {
						this.station.name = res.data.name;
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:station.displayName.updated",
					res => {
						this.station.displayName = res.data.displayName;
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:station.description.updated",
					res => {
						this.station.description = res.data.description;
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:station.partyMode.updated",
					res => {
						if (this.station.type === "community")
							this.station.partyMode = res.data.partyMode;
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:station.playMode.updated",
					res => {
						this.station.playMode = res.data.playMode;
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:station.theme.updated",
					res => {
						const { theme } = res.data;
						this.station.theme = theme;
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:station.privacy.updated",
					res => {
						this.station.privacy = res.data.privacy;
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:station.queue.lock.toggled",
					res => {
						this.station.locked = res.data.locked;
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:station.includedPlaylist",
					res => {
						const { playlist } = res.data;
						const playlistIndex = this.includedPlaylists
							.map(includedPlaylist => includedPlaylist._id)
							.indexOf(playlist._id);
						if (playlistIndex === -1)
							this.includedPlaylists.push(playlist);
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:station.excludedPlaylist",
					res => {
						const { playlist } = res.data;
						const playlistIndex = this.excludedPlaylists
							.map(excludedPlaylist => excludedPlaylist._id)
							.indexOf(playlist._id);
						if (playlistIndex === -1)
							this.excludedPlaylists.push(playlist);
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:station.removedIncludedPlaylist",
					res => {
						const { playlistId } = res.data;
						const playlistIndex = this.includedPlaylists
							.map(playlist => playlist._id)
							.indexOf(playlistId);
						if (playlistIndex >= 0)
							this.includedPlaylists.splice(playlistIndex, 1);
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:station.removedExcludedPlaylist",
					res => {
						const { playlistId } = res.data;
						const playlistIndex = this.excludedPlaylists
							.map(playlist => playlist._id)
							.indexOf(playlistId);
						if (playlistIndex >= 0)
							this.excludedPlaylists.splice(playlistIndex, 1);
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:station.deleted",
					() => {
						new Toast(`The station you were editing was deleted.`);
						this.closeModal("manageStation");
					},
					{ modal: "manageStation" }
				);
			} else {
				new Toast(`Station with that ID not found`);
				this.closeModal("manageStation");
			}
		});

		this.socket.on(
			"event:station.queue.updated",
			res => this.updateSongsList(res.data.queue),
			{ modal: "manageStation" }
		);

		this.socket.on(
			"event:station.queue.song.repositioned",
			res => this.repositionSongInList(res.data.song),
			{ modal: "manageStation" }
		);

		this.socket.on(
			"event:station.pause",
			() => this.updateStationPaused(true),
			{ modal: "manageStation" }
		);

		this.socket.on(
			"event:station.resume",
			() => this.updateStationPaused(false),
			{ modal: "manageStation" }
		);

		this.socket.on(
			"event:station.nextSong",
			res => {
				const { currentSong } = res.data;
				this.updateCurrentSong(currentSong || {});
			},
			{ modal: "manageStation" }
		);

		if (this.isOwnerOrAdmin()) {
			this.socket.on(
				"event:playlist.song.added",
				res => {
					if (this.stationPlaylist._id === res.data.playlistId)
						this.stationPlaylist.songs.push(res.data.song);
				},
				{
					modal: "manageStation"
				}
			);

			this.socket.on(
				"event:playlist.song.removed",
				res => {
					if (this.stationPlaylist._id === res.data.playlistId) {
						// remove song from array of playlists
						this.stationPlaylist.songs.forEach((song, index) => {
							if (song.youtubeId === res.data.youtubeId)
								this.stationPlaylist.songs.splice(index, 1);
						});
					}
				},
				{
					modal: "manageStation"
				}
			);

			this.socket.on(
				"event:playlist.songs.repositioned",
				res => {
					if (this.stationPlaylist._id === res.data.playlistId) {
						// for each song that has a new position
						res.data.songsBeingChanged.forEach(changedSong => {
							this.stationPlaylist.songs.forEach(
								(song, index) => {
									// find song locally
									if (
										song.youtubeId === changedSong.youtubeId
									) {
										// change song position attribute
										this.stationPlaylist.songs[
											index
										].position = changedSong.position;

										// reposition in array if needed
										if (index !== changedSong.position - 1)
											this.stationPlaylist.songs.splice(
												changedSong.position - 1,
												0,
												this.stationPlaylist.songs.splice(
													index,
													1
												)[0]
											);
									}
								}
							);
						});
					}
				},
				{
					modal: "manageStation"
				}
			);
		}
	},
	beforeUnmount() {
		this.socket.dispatch(
			"apis.leaveRoom",
			`manage-station.${this.stationId}`,
			() => {}
		);

		if (this.isOwnerOrAdmin()) this.showTab("settings");
		this.clearStation();
	},
	methods: {
		isOwner() {
			return (
				this.loggedIn &&
				this.station &&
				this.userId === this.station.owner
			);
		},
		isAdmin() {
			return this.loggedIn && this.role === "admin";
		},
		isOwnerOrAdmin() {
			return this.isOwner() || this.isAdmin();
		},
		isPartyMode() {
			return (
				this.station &&
				this.station.type === "community" &&
				this.station.partyMode
			);
		},
		isAllowedToParty() {
			return (
				this.station &&
				this.isPartyMode() &&
				(!this.station.locked || this.isOwnerOrAdmin()) &&
				this.loggedIn
			);
		},
		isPlaylistMode() {
			return this.station && !this.isPartyMode();
		},
		removeStation() {
			this.socket.dispatch("stations.remove", this.station._id, res => {
				new Toast(res.message);
			});
		},
		resumeStation() {
			this.socket.dispatch("stations.resume", this.station._id, res => {
				if (res.status !== "success")
					new Toast(`Error: ${res.message}`);
				else new Toast("Successfully resumed the station.");
			});
		},
		pauseStation() {
			this.socket.dispatch("stations.pause", this.station._id, res => {
				if (res.status !== "success")
					new Toast(`Error: ${res.message}`);
				else new Toast("Successfully paused the station.");
			});
		},
		skipStation() {
			this.socket.dispatch(
				"stations.forceSkip",
				this.station._id,
				res => {
					if (res.status !== "success")
						new Toast(`Error: ${res.message}`);
					else
						new Toast(
							"Successfully skipped the station's current song."
						);
				}
			);
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
		...mapActions("modals/manageStation", [
			"editStation",
			"setIncludedPlaylists",
			"setExcludedPlaylists",
			"clearStation",
			"updateSongsList",
			"updateStationPlaylist",
			"repositionSongInList",
			"updateStationPaused",
			"updateCurrentSong"
		]),
		...mapActions({
			showTab(dispatch, payload) {
				if (this.$refs[`${payload}-tab`])
					this.$refs[`${payload}-tab`].scrollIntoView({
						block: "nearest"
					}); // Only works if the ref exists, which it doesn't always
				return dispatch("modals/manageStation/showTab", payload);
			}
		}),
		...mapActions("modalVisibility", ["openModal", "closeModal"]),
		...mapActions("user/playlists", ["editPlaylist"])
	}
};
</script>

<style lang="scss">
.manage-station-modal.modal {
	z-index: 1800;
	.modal-card {
		width: 1300px;
		height: 100%;
		overflow: auto;
		.tab > button {
			width: 100%;
			margin-bottom: 10px;
		}
		.currently-playing.song-item {
			.song-info {
				width: calc(100% - 150px);
			}
			.thumbnail {
				min-width: 130px;
				width: 130px;
				height: 130px;
			}
		}
	}
}
</style>

<style lang="scss" scoped>
.night-mode {
	.manage-station-modal.modal .modal-card-body .custom-modal-body {
		.left-section {
			#about-station-container {
				background-color: var(--dark-grey-3) !important;
				border: 0;
			}
			.section {
				background-color: transparent !important;
			}
			.tab-selection .button {
				background: var(--dark-grey);
				color: var(--white);
			}
			.tab {
				background-color: var(--dark-grey-3);
				border: 0;
			}
		}
		.right-section .section,
		#queue {
			border-radius: 5px;
			background-color: transparent !important;
		}
	}
}

.manage-station-modal.modal .modal-card-body .custom-modal-body {
	display: flex;
	flex-wrap: wrap;
	height: 100%;

	.section {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		width: auto;
		padding: 15px !important;
		margin: 0 10px;
	}

	.left-section {
		flex-basis: 50%;
		height: 100%;
		overflow-y: auto;
		flex-grow: 1;

		.section:first-child {
			padding: 0 15px 15px !important;
		}

		#about-station-container {
			padding: 20px;
			display: flex;
			flex-direction: column;
			flex-grow: unset;
			border-radius: 5px;
			margin: 0 0 20px 0;
			background-color: var(--white);
			border: 1px solid var(--light-grey-3);

			#station-info {
				#station-name {
					flex-direction: row !important;
					display: flex;
					flex-direction: row;
					max-width: 100%;

					h1 {
						margin: 0;
						font-size: 36px;
						line-height: 0.8;
					}

					i {
						margin-left: 10px;
						font-size: 30px;
						color: var(--yellow);
						&.stationMode {
							padding-left: 10px;
							margin-left: auto;
							color: var(--primary-color);
						}
					}

					.verified-station {
						color: var(--primary-color);
					}
				}

				p {
					max-width: 700px;
					margin-bottom: 10px;
				}
			}

			#admin-buttons {
				display: flex;

				.button {
					margin: 3px;
				}
			}
		}

		.tab-selection {
			display: flex;
			overflow-x: auto;

			.button {
				border-radius: 5px 5px 0 0;
				border: 0;
				text-transform: uppercase;
				font-size: 14px;
				color: var(--dark-grey-3);
				background-color: var(--light-grey-2);
				flex-grow: 1;
				height: 32px;

				&:not(:first-of-type) {
					margin-left: 5px;
				}
			}

			.selected {
				background-color: var(--primary-color) !important;
				color: var(--white) !important;
				font-weight: 600;
			}
		}
		.tab {
			border: 1px solid var(--light-grey-3);
			padding: 15px;
			border-radius: 0 0 5px 5px;
		}
	}
	.right-section {
		flex-basis: 50%;
		height: 100%;
		overflow-y: auto;
		flex-grow: 1;
		.section {
			.queue-title {
				display: flex;
				line-height: 30px;
				.material-icons {
					margin-left: 5px;
					margin-bottom: 5px;
					font-size: 28px;
					cursor: pointer;
					&:first-of-type {
						margin-left: auto;
					}
					&.skip-station {
						color: var(--red);
					}
					&.resume-station,
					&.pause-station {
						color: var(--primary-color);
					}
				}
			}
			.currently-playing {
				margin-bottom: 10px;
			}
		}
	}
}

@media screen and (max-width: 1100px) {
	.manage-station-modal.modal .modal-card-body .custom-modal-body {
		.left-section,
		.right-section {
			flex-basis: unset;
			height: auto;
		}
	}
}
</style>
