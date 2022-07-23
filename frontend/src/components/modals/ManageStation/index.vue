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
					<div class="station-info-box-wrapper">
						<station-info-box
							:station="station"
							:station-paused="stationPaused"
							:show-go-to-station="sector !== 'station'"
						/>
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
								v-if="canRequest()"
								class="button is-default"
								:class="{ selected: tab === 'request' }"
								ref="request-tab"
								@click="showTab('request')"
							>
								Request
							</button>
							<button
								v-if="
									isOwnerOrAdmin() && station.autofill.enabled
								"
								class="button is-default"
								:class="{ selected: tab === 'autofill' }"
								ref="autofill-tab"
								@click="showTab('autofill')"
							>
								Autofill
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
							:modal-uuid="modalUuid"
							ref="settingsTabComponent"
						/>
						<request
							v-if="canRequest()"
							class="tab"
							v-show="tab === 'request'"
							:sector="'manageStation'"
							:disable-auto-request="sector !== 'station'"
							:modal-uuid="modalUuid"
						/>
						<playlist-tab-base
							v-if="isOwnerOrAdmin() && station.autofill.enabled"
							class="tab"
							v-show="tab === 'autofill'"
							:type="'autofill'"
							:modal-uuid="modalUuid"
						>
							<template #info>
								<p>
									Select playlists to automatically add songs
									within to the queue
								</p>
							</template>
						</playlist-tab-base>
						<playlist-tab-base
							v-if="isOwnerOrAdmin()"
							class="tab"
							v-show="tab === 'blacklist'"
							:type="'blacklist'"
							:modal-uuid="modalUuid"
						>
							<template #info>
								<p>
									Blacklist a playlist to prevent all songs
									within from playing in this station
								</p>
							</template>
						</playlist-tab-base>
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
					<queue :modal-uuid="modalUuid" sector="manageStation" />
				</div>
			</div>
		</template>
		<template #footer>
			<div v-if="isOwnerOrAdmin()" class="right">
				<quick-confirm @confirm="resetQueue()">
					<a class="button is-danger">Reset queue</a>
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

import { mapModalState, mapModalActions } from "@/vuex_helpers";

import Queue from "@/components/Queue.vue";
import SongItem from "@/components/SongItem.vue";
import StationInfoBox from "@/components/StationInfoBox.vue";

import Settings from "./Settings.vue";
import PlaylistTabBase from "@/components/PlaylistTabBase.vue";
import Request from "@/components/Request.vue";

export default {
	components: {
		Queue,
		SongItem,
		StationInfoBox,
		Settings,
		PlaylistTabBase,
		Request
	},
	props: {
		modalUuid: { type: String, default: "" }
	},
	computed: {
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			userId: state => state.user.auth.userId,
			role: state => state.user.auth.role
		}),
		...mapModalState("modals/manageStation/MODAL_UUID", {
			stationId: state => state.stationId,
			sector: state => state.sector,
			tab: state => state.tab,
			station: state => state.station,
			songsList: state => state.songsList,
			stationPlaylist: state => state.stationPlaylist,
			autofill: state => state.autofill,
			blacklist: state => state.blacklist,
			stationPaused: state => state.stationPaused,
			currentSong: state => state.currentSong
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	watch: {
		// eslint-disable-next-line
		"station.requests": function (requests) {
			if (this.tab === "request" && !this.canRequest()) {
				if (this.isOwnerOrAdmin()) this.showTab("settings");
				else if (!(this.sector === "home" && !this.isOwnerOrAdmin()))
					this.closeModal("manageStation");
			}
		},
		// eslint-disable-next-line
		"station.autofill": function (autofill) {
			if (this.tab === "autofill" && autofill && !autofill.enabled)
				this.showTab("settings");
		}
	},
	mounted() {
		this.socket.dispatch(`stations.getStationById`, this.stationId, res => {
			if (res.status === "success") {
				const { station } = res.data;
				this.editStation(station);

				if (!this.isOwnerOrAdmin()) this.showTab("request");

				const currentSong = res.data.station.currentSong
					? res.data.station.currentSong
					: {};

				this.updateCurrentSong(currentSong);

				this.updateStationPaused(res.data.station.paused);

				this.socket.dispatch(
					"stations.getStationAutofillPlaylistsById",
					this.stationId,
					res => {
						if (res.status === "success")
							this.setAutofillPlaylists(res.data.playlists);
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
					{ modalUuid: this.modalUuid }
				);

				this.socket.on(
					"event:station.autofillPlaylist",
					res => {
						const { playlist } = res.data;
						const playlistIndex = this.autofill
							.map(autofillPlaylist => autofillPlaylist._id)
							.indexOf(playlist._id);
						if (playlistIndex === -1) this.autofill.push(playlist);
					},
					{ modalUuid: this.modalUuid }
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
					{ modalUuid: this.modalUuid }
				);

				this.socket.on(
					"event:station.removedAutofillPlaylist",
					res => {
						const { playlistId } = res.data;
						const playlistIndex = this.autofill
							.map(playlist => playlist._id)
							.indexOf(playlistId);
						if (playlistIndex >= 0)
							this.autofill.splice(playlistIndex, 1);
					},
					{ modalUuid: this.modalUuid }
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
					{ modalUuid: this.modalUuid }
				);

				this.socket.on(
					"event:station.deleted",
					() => {
						new Toast(`The station you were editing was deleted.`);
						this.closeModal("manageStation");
					},
					{ modalUuid: this.modalUuid }
				);

				this.socket.on(
					"event:user.station.favorited",
					res => {
						if (res.data.stationId === this.stationId)
							this.updateIsFavorited(true);
					},
					{ modalUuid: this.modalUuid }
				);

				this.socket.on(
					"event:user.station.unfavorited",
					res => {
						if (res.data.stationId === this.stationId)
							this.updateIsFavorited(false);
					},
					{ modalUuid: this.modalUuid }
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
			{ modalUuid: this.modalUuid }
		);

		this.socket.on(
			"event:manageStation.queue.song.repositioned",
			res => {
				if (res.data.stationId === this.station._id)
					this.repositionSongInList(res.data.song);
			},
			{ modalUuid: this.modalUuid }
		);

		this.socket.on(
			"event:station.pause",
			res => {
				if (res.data.stationId === this.station._id)
					this.updateStationPaused(true);
			},
			{ modalUuid: this.modalUuid }
		);

		this.socket.on(
			"event:station.resume",
			res => {
				if (res.data.stationId === this.station._id)
					this.updateStationPaused(false);
			},
			{ modalUuid: this.modalUuid }
		);

		this.socket.on(
			"event:station.nextSong",
			res => {
				if (res.data.stationId === this.station._id)
					this.updateCurrentSong(res.data.currentSong || {});
			},
			{ modalUuid: this.modalUuid }
		);

		if (this.isOwnerOrAdmin()) {
			this.socket.on(
				"event:playlist.song.added",
				res => {
					if (this.stationPlaylist._id === res.data.playlistId)
						this.stationPlaylist.songs.push(res.data.song);
				},
				{
					modalUuid: this.modalUuid
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
					modalUuid: this.modalUuid
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
					modalUuid: this.modalUuid
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

		// Delete the VueX module that was created for this modal, after all other cleanup tasks are performed
		this.$store.unregisterModule([
			"modals",
			"manageStation",
			this.modalUuid
		]);
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
		canRequest() {
			return (
				this.station &&
				this.loggedIn &&
				this.station.requests &&
				this.station.requests.enabled &&
				(this.station.requests.access === "user" ||
					(this.station.requests.access === "owner" &&
						this.isOwnerOrAdmin()))
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
		resetQueue() {
			this.socket.dispatch(
				"stations.resetQueue",
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
		...mapModalActions("modals/manageStation/MODAL_UUID", [
			"editStation",
			"setAutofillPlaylists",
			"setBlacklist",
			"clearStation",
			"updateSongsList",
			"updateStationPlaylist",
			"repositionSongInList",
			"updateStationPaused",
			"updateCurrentSong",
			"updateStation",
			"updateIsFavorited"
		]),
		...mapActions({
			showTab(dispatch, payload) {
				if (this.$refs[`${payload}-tab`])
					this.$refs[`${payload}-tab`].scrollIntoView({
						block: "nearest"
					}); // Only works if the ref exists, which it doesn't always
				return dispatch(
					`modals/manageStation/${this.modalUuid}/showTab`,
					payload
				);
			}
		}),
		...mapActions("modalVisibility", ["openModal", "closeModal"])
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
			.station-info-box-wrapper {
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
		.station-info-box-wrapper {
			border-radius: @border-radius;
			border: 1px solid var(--light-grey-3);
			overflow: hidden;
			margin-bottom: 20px;
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
			padding: 15px 10px;
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
