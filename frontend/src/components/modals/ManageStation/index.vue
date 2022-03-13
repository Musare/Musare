<template>
	<modal
		v-if="station"
		:title="
			sector === 'home' && !isOwnerOrAdmin()
				? 'View Queue'
				: !isOwnerOrAdmin()
				? 'Add Song to Queue'
				: 'Manage Station'
		"
		:style="`--primary-color: var(--${station.theme})`"
		class="manage-station-modal"
		:size="isOwnerOrAdmin() || sector !== 'home' ? 'wide' : null"
		:split="isOwnerOrAdmin() || sector !== 'home'"
	>
		<template #body v-if="station && station._id">
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
							</div>
							<p>{{ station.description }}</p>
						</div>

						<div id="admin-buttons">
							<!-- (Admin) Pause/Resume Button -->
							<button
								v-if="isOwnerOrAdmin() && stationPaused"
								class="button is-danger"
								@click="resumeStation()"
							>
								<i class="material-icons icon-with-button"
									>play_arrow</i
								>
								<span> Resume Station </span>
							</button>
							<button
								v-if="isOwnerOrAdmin() && !stationPaused"
								class="button is-danger"
								@click="pauseStation()"
							>
								<i class="material-icons icon-with-button"
									>pause</i
								>
								<span> Pause Station </span>
							</button>

							<!-- (Admin) Skip Button -->
							<button
								v-if="isOwnerOrAdmin()"
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
					<div v-if="isOwnerOrAdmin() || sector !== 'home'">
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
								v-if="isOwnerOrAdmin()"
								class="button is-default"
								:class="{ selected: tab === 'autofill' }"
								ref="autofill-tab"
								@click="showTab('autofill')"
							>
								Autofill
							</button>
							<button
								v-if="
									station.requests.enabled &&
									(isAllowedToParty() || isOwnerOrAdmin())
								"
								class="button is-default"
								:class="{ selected: tab === 'request' }"
								ref="request-tab"
								@click="showTab('request')"
							>
								Request
							</button>
							<button
								v-if="isOwnerOrAdmin()"
								class="button is-default"
								:class="{ selected: tab === 'blacklist' }"
								ref="blacklist-tab"
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
						<autofill
							v-if="isOwnerOrAdmin()"
							class="tab"
							v-show="tab === 'autofill'"
						/>
						<request
							v-if="
								station.requests.enabled &&
								(isAllowedToParty() || isOwnerOrAdmin())
							"
							class="tab"
							v-show="tab === 'request'"
							:sector="sector"
						/>
						<blacklist
							v-if="isOwnerOrAdmin()"
							class="tab"
							v-show="tab === 'blacklist'"
						/>
					</div>
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
						:requested-by="true"
						header="Currently Playing.."
						class="currently-playing"
					/>
					<queue sector="manageStation" />
				</div>
			</div>
		</template>
		<template #footer>
			<div v-if="isOwnerOrAdmin()" class="right">
				<quick-confirm @confirm="clearAndRefillStationQueue()">
					<a class="button is-danger">
						Clear and refill station queue
					</a>
				</quick-confirm>
				<quick-confirm @confirm="removeStation()">
					<button class="button is-danger">Delete station</button>
				</quick-confirm>
			</div>
		</template>
	</modal>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";

import Toast from "toasters";

import QuickConfirm from "@/components/QuickConfirm.vue";
import Queue from "@/components/Queue.vue";
import SongItem from "@/components/SongItem.vue";
import Modal from "../../Modal.vue";

import Settings from "./Tabs/Settings.vue";
import Autofill from "./Tabs/Autofill.vue";
import Request from "@/components/Request.vue";
import Blacklist from "./Tabs/Blacklist.vue";

export default {
	components: {
		Modal,
		QuickConfirm,
		Queue,
		SongItem,
		Settings,
		Autofill,
		Request,
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
			stationPlaylist: state => state.stationPlaylist,
			includedPlaylists: state => state.includedPlaylists,
			blacklist: state => state.blacklist,
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

				if (!this.isOwnerOrAdmin()) this.showTab("songs");

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
					"stations.getStationBlacklistById",
					this.stationId,
					res => {
						if (res.status === "success")
							this.setBlacklist(res.data.playlists);
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
					"event:station.updated",
					res => {
						this.updateStation(res.data.station);
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
					"event:station.blacklistedPlaylist",
					res => {
						const { playlist } = res.data;
						const playlistIndex = this.blacklist
							.map(blacklistedPlaylist => blacklistedPlaylist._id)
							.indexOf(playlist._id);
						if (playlistIndex === -1) this.blacklist.push(playlist);
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
					"event:station.removedBlacklistedPlaylist",
					res => {
						const { playlistId } = res.data;
						const playlistIndex = this.blacklist
							.map(playlist => playlist._id)
							.indexOf(playlistId);
						if (playlistIndex >= 0)
							this.blacklist.splice(playlistIndex, 1);
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
			"event:manageStation.queue.updated",
			res => {
				if (res.data.stationId === this.station._id)
					this.updateSongsList(res.data.queue);
			},
			{ modal: "manageStation" }
		);

		this.socket.on(
			"event:manageStation.queue.song.repositioned",
			res => {
				if (res.data.stationId === this.station._id)
					this.repositionSongInList(res.data.song);
			},
			{ modal: "manageStation" }
		);

		this.socket.on(
			"event:station.pause",
			res => {
				if (res.data.stationId === this.station._id)
					this.updateStationPaused(true);
			},
			{ modal: "manageStation" }
		);

		this.socket.on(
			"event:station.resume",
			res => {
				if (res.data.stationId === this.station._id)
					this.updateStationPaused(false);
			},
			{ modal: "manageStation" }
		);

		this.socket.on(
			"event:station.nextSong",
			res => {
				if (res.data.stationId === this.station._id)
					this.updateCurrentSong(res.data.currentSong || {});
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
		isAllowedToParty() {
			return (
				this.station &&
				(!this.station.locked || this.isOwnerOrAdmin()) &&
				this.loggedIn
			);
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
			"setBlacklist",
			"clearStation",
			"updateSongsList",
			"updateStationPlaylist",
			"repositionSongInList",
			"updateStationPaused",
			"updateCurrentSong",
			"updateStation"
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

<style lang="less">
.manage-station-modal.modal .modal-card {
	.tab > button {
		width: 100%;
		margin-bottom: 10px;
	}
	.currently-playing.song-item {
		.thumbnail {
			min-width: 130px;
			width: 130px;
			height: 130px;
		}
	}
}
</style>

<style lang="less" scoped>
.night-mode {
	.manage-station-modal.modal .modal-card-body {
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
			border-radius: @border-radius;
			background-color: transparent !important;
		}
	}
}

.manage-station-modal.modal .modal-card-body {
	display: flex;
	flex-wrap: wrap;
	height: 100%;

	.left-section {
		#about-station-container {
			padding: 20px;
			display: flex;
			flex-direction: column;
			flex-grow: unset;
			border-radius: @border-radius;
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
						text-overflow: ellipsis;
						overflow: hidden;
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
					display: -webkit-box;
					max-width: 700px;
					margin-bottom: 10px;
					overflow: hidden;
					text-overflow: ellipsis;
					-webkit-box-orient: vertical;
					-webkit-line-clamp: 3;
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
				border-radius: @border-radius @border-radius 0 0;
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
			border-radius: 0 0 @border-radius @border-radius;
		}
	}
	.right-section {
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
						color: var(--dark-red);
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
	&.modal-wide .left-section .section:first-child {
		padding: 0 15px 15px !important;
	}
}
</style>
