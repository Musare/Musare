<template>
	<modal
		v-if="station"
		:title="
			!isOwnerOrAdmin() && station.partyMode
				? 'Add Song to Queue'
				: 'Manage Station'
		"
		class="manage-station-modal"
	>
		<template #body>
			<div class="custom-modal-body" v-if="station && station._id">
				<div class="left-section">
					<div class="section tabs-container">
						<div class="tab-selection">
							<button
								v-if="isOwnerOrAdmin()"
								class="button is-default"
								:class="{ selected: tab === 'settings' }"
								@click="showTab('settings')"
							>
								Settings
							</button>
							<button
								v-if="
									isOwnerOrAdmin() ||
										(loggedIn &&
											station.type === 'community' &&
											station.partyMode &&
											((station.locked &&
												isOwnerOrAdmin()) ||
												!station.locked))
								"
								class="button is-default"
								:class="{ selected: tab === 'playlists' }"
								@click="showTab('playlists')"
							>
								Playlists
							</button>
							<button
								v-if="
									loggedIn &&
										station.type === 'community' &&
										station.partyMode &&
										((station.locked && isOwnerOrAdmin()) ||
											!station.locked)
								"
								class="button is-default"
								:class="{ selected: tab === 'search' }"
								@click="showTab('search')"
							>
								Search
							</button>
							<button
								v-if="isOwnerOrAdmin()"
								class="button is-default"
								:class="{ selected: tab === 'blacklist' }"
								@click="showTab('blacklist')"
							>
								Blacklist
							</button>
						</div>
						<settings
							v-if="isOwnerOrAdmin()"
							class="tab"
							v-show="tab === 'settings'"
						/>
						<playlists
							v-if="
								isOwnerOrAdmin() ||
									(loggedIn &&
										station.type === 'community' &&
										station.partyMode &&
										((station.locked && isOwnerOrAdmin()) ||
											!station.locked))
							"
							class="tab"
							v-show="tab === 'playlists'"
						/>
						<search
							v-if="
								loggedIn &&
									station.type === 'community' &&
									station.partyMode &&
									((station.locked && isOwnerOrAdmin()) ||
										!station.locked)
							"
							class="tab"
							v-show="tab === 'search'"
						/>
						<blacklist
							v-if="isOwnerOrAdmin()"
							class="tab"
							v-show="tab === 'blacklist'"
						/>
					</div>
				</div>
				<div class="right-section">
					<div class="section">
						<div class="queue-title">
							<h4 class="section-title">Queue</h4>
							<i
								v-if="isOwnerOrAdmin() && stationPaused"
								@click="resumeStation()"
								class="material-icons resume-station"
								content="Resume Station"
								v-tippy
							>
								play_arrow
							</i>
							<i
								v-if="isOwnerOrAdmin() && !stationPaused"
								@click="pauseStation()"
								class="material-icons pause-station"
								content="Pause Station"
								v-tippy
							>
								pause
							</i>
							<confirm
								v-if="isOwnerOrAdmin()"
								@confirm="skipStation()"
							>
								<i
									class="material-icons skip-station"
									content="Force Skip Station"
									v-tippy
								>
									skip_next
								</i>
							</confirm>
						</div>
						<hr class="section-horizontal-rule" />
						<song-item
							v-if="currentSong._id"
							:song="currentSong"
							:large-thumbnail="true"
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
			<a
				class="button is-default"
				v-if="isOwnerOrAdmin() && !station.partyMode"
				@click="stationPlaylist()"
			>
				View Station Playlist
			</a>
			<button
				class="button is-primary tab-actionable-button"
				v-if="loggedIn && station.type === 'official'"
				@click="openModal('requestSong')"
			>
				<i class="material-icons icon-with-button">queue</i>
				<span class="optional-desktop-only-text"> Request Song </span>
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
import Search from "./Tabs/Search.vue";
import Blacklist from "./Tabs/Blacklist.vue";

export default {
	components: {
		Modal,
		Confirm,
		Queue,
		SongItem,
		Settings,
		Playlists,
		Search,
		Blacklist
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
					this.showTab("search");

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
					"event:station.updateName",
					res => {
						this.station.name = res.data.name;
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:station.updateDisplayName",
					res => {
						this.station.displayName = res.data.displayName;
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:station.updateDescription",
					res => {
						this.station.description = res.data.description;
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:partyMode.updated",
					res => {
						if (this.station.type === "community")
							this.station.partyMode = res.data.partyMode;
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:playMode.updated",
					res => {
						this.station.playMode = res.data.playMode;
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:station.themeUpdated",
					res => {
						const { theme } = res.data;
						this.station.theme = theme;
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:station.updatePrivacy",
					res => {
						this.station.privacy = res.data.privacy;
					},
					{ modal: "manageStation" }
				);

				this.socket.on(
					"event:queueLockToggled",
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
			} else {
				new Toast(`Station with that ID not found`);
				this.closeModal("manageStation");
			}
		});

		this.socket.on(
			"event:queue.update",
			res => this.updateSongsList(res.data.queue),
			{ modal: "manageStation" }
		);

		this.socket.on(
			"event:queue.repositionSong",
			res => this.repositionSongInList(res.data.song),
			{ modal: "manageStation" }
		);

		this.socket.on(
			"event:stations.pause",
			() => this.updateStationPaused(true),
			{ modal: "manageStation" }
		);

		this.socket.on(
			"event:stations.resume",
			() => this.updateStationPaused(false),
			{ modal: "manageStation" }
		);

		this.socket.on(
			"event:songs.next",
			res => {
				const { currentSong } = res.data;

				this.updateCurrentSong(currentSong || {});
			},
			{ modal: "manageStation" }
		);
	},
	beforeDestroy() {
		this.socket.dispatch(
			"apis.leaveRoom",
			`manage-station.${this.stationId}`,
			() => {}
		);

		this.repositionSongInList([]);
		this.clearStation();
		this.showTab("settings");
	},
	methods: {
		isOwner() {
			return this.loggedIn && this.userId === this.station.owner;
		},
		isAdmin() {
			return this.loggedIn && this.role === "admin";
		},
		isOwnerOrAdmin() {
			return this.isOwner() || this.isAdmin();
		},
		removeStation() {
			this.socket.dispatch("stations.remove", this.station._id, res => {
				new Toast(res.message);
				if (res.status === "success") {
					this.closeModal("manageStation");
				}
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
		stationPlaylist() {
			this.socket.dispatch(
				"playlists.getPlaylistForStation",
				this.station._id,
				false,
				res => {
					if (res.status === "success") {
						this.editPlaylist(res.data.playlist._id);
						this.openModal("editPlaylist");
					} else {
						new Toast(res.message);
					}
				}
			);
		},
		...mapActions("modals/manageStation", [
			"showTab",
			"editStation",
			"setIncludedPlaylists",
			"setExcludedPlaylists",
			"clearStation",
			"updateSongsList",
			"repositionSongInList",
			"updateStationPaused",
			"updateCurrentSong"
		]),
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
	}
}
</style>

<style lang="scss" scoped>
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

		.tabs-container {
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
					background-color: var(--dark-grey-3) !important;
					color: var(--white) !important;
				}
			}
			.tab {
				border: 1px solid var(--light-grey-3);
				padding: 15px;
				border-radius: 0 0 5px 5px;
			}
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
