<template>
	<div>
		<metadata v-if="exists && !loading" :title="`${station.displayName}`" />
		<metadata v-else-if="!exists && !loading" :title="`Not found`" />

		<main-header v-if="exists" />

		<div
			id="station-outer-container"
			:style="[!exists ? { margin: 0, padding: 0 } : {}]"
		>
			<div v-show="loading" class="progress" />
			<div
				v-show="!loading && exists"
				id="station-inner-container"
				:class="{ 'nothing-here': noSong }"
			>
				<div id="about-station-container" class="quadrant">
					<div id="station-info">
						<div class="row" id="station-name">
							<h1>{{ station.displayName }}</h1>
							<a href="#">
								<!-- Favorite Station Button -->
								<i
									v-if="loggedIn && station.isFavorited"
									@click.prevent="unfavoriteStation()"
									class="material-icons"
									>star</i
								>
								<i
									v-if="loggedIn && !station.isFavorited"
									@click.prevent="favoriteStation()"
									class="material-icons"
									>star_border</i
								>
							</a>
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
							<span class="optional-desktop-only-text">
								Resume Station
							</span>
						</button>
						<button
							class="button is-danger"
							@click="pauseStation()"
							v-else
						>
							<i class="material-icons icon-with-button">pause</i>
							<span class="optional-desktop-only-text">
								Pause Station
							</span>
						</button>

						<!-- (Admin) Skip Button -->
						<button class="button is-danger" @click="skipStation()">
							<i class="material-icons icon-with-button"
								>skip_next</i
							>
							<span class="optional-desktop-only-text">
								Force Skip
							</span>
						</button>

						<!-- (Admin) Station Settings Button -->
						<button
							class="button is-primary"
							@click="openSettings()"
						>
							<i class="material-icons icon-with-button"
								>settings</i
							>
							<span class="optional-desktop-only-text">
								Station settings
							</span>
						</button>
					</div>
				</div>

				<div class="player-container quadrant" v-show="!noSong">
					<div id="video-container">
						<div id="player" style="width: 100%; height: 100%" />
						<div class="player-cannot-autoplay" v-if="!canAutoplay">
							<p>
								Please click anywhere on the screen for the
								video to start
							</p>
						</div>
					</div>
					<div id="seeker-bar-container">
						<div id="seeker-bar" style="width: 0%" />
					</div>
					<div id="control-bar-container">
						<div id="left-buttons">
							<!-- Debug Box -->
							<button
								class="button is-primary"
								@click="togglePlayerDebugBox()"
								@dblclick="resetPlayerDebugBox()"
							>
								<i class="material-icons icon-with-button">
									bug_report
								</i>
								<span class="optional-desktop-only-text">
									Debug
								</span>
							</button>

							<!-- Local Pause/Resume Button -->
							<button
								class="button is-primary"
								@click="resumeLocalStation()"
								id="local-resume"
								v-if="localPaused"
							>
								<i class="material-icons">play_arrow</i>
								<span class="optional-desktop-only-text"
									>Play locally</span
								>
							</button>
							<button
								class="button is-primary"
								@click="pauseLocalStation()"
								id="local-pause"
								v-else
							>
								<i class="material-icons">pause</i>
								<span class="optional-desktop-only-text"
									>Pause locally</span
								>
							</button>

							<!-- Vote to Skip Button -->
							<button
								v-if="loggedIn"
								class="button is-primary"
								@click="voteSkipStation()"
							>
								<i class="material-icons icon-with-button"
									>skip_next</i
								>
								<span class="optional-desktop-only-text"
									>Vote to skip (</span
								>
								{{ currentSong.skipVotes }}
								<span class="optional-desktop-only-text"
									>)</span
								>
							</button>
						</div>
						<div id="duration">
							<p>
								{{ timeElapsed }} /
								{{ utils.formatTime(currentSong.duration) }}
							</p>
						</div>
						<p id="volume-control">
							<i
								v-if="muted"
								class="material-icons"
								@click="toggleMute()"
								>volume_mute</i
							>
							<i
								v-else
								class="material-icons"
								@click="toggleMute()"
								>volume_down</i
							>
							<input
								v-model="volumeSliderValue"
								type="range"
								min="0"
								max="10000"
								class="volume-slider active"
								@change="changeVolume()"
								@input="changeVolume()"
							/>
							<i class="material-icons" @click="increaseVolume()"
								>volume_up</i
							>
						</p>
						<div id="right-buttons" v-if="loggedIn">
							<!-- Ratings (Like/Dislike) Buttons -->
							<div
								id="ratings"
								v-if="
									currentSong.likes !== -1 &&
										currentSong.dislikes !== -1
								"
								:class="{
									liked: liked,
									disliked: disliked
								}"
							>
								<!-- Like Song Button -->
								<button
									class="button is-success"
									id="like-song"
									@click="toggleLike()"
								>
									<i
										class="material-icons icon-with-button"
										:class="{ liked: liked }"
										>thumb_up_alt</i
									>{{ currentSong.likes }}
								</button>

								<!-- Dislike Song Button -->
								<button
									class="button is-danger"
									id="dislike-song"
									@click="toggleDislike()"
								>
									<i
										class="material-icons icon-with-button"
										:class="{
											disliked: disliked
										}"
										>thumb_down_alt</i
									>{{ currentSong.dislikes }}
								</button>
							</div>

							<!-- Add Song To Playlist Button & Dropdown -->
							<div id="add-song-to-playlist">
								<div class="control has-addons">
									<button
										class="button is-primary"
										@click="
											showPlaylistDropdown = !showPlaylistDropdown
										"
									>
										<i class="material-icons">queue</i>
										<span class="optional-desktop-only-text"
											>Add Song To Playlist</span
										>
									</button>
									<button
										class="button"
										id="dropdown-toggle"
										@click="
											showPlaylistDropdown = !showPlaylistDropdown
										"
									>
										<i class="material-icons">
											{{
												showPlaylistDropdown
													? "expand_more"
													: "expand_less"
											}}
										</i>
									</button>
								</div>
								<add-to-playlist-dropdown
									v-if="showPlaylistDropdown"
								/>
							</div>
						</div>
					</div>
				</div>
				<p class="player-container nothing-here-text" v-if="noSong">
					No song is currently playing
				</p>

				<div id="sidebar-container" class="quadrant">
					<station-sidebar />
				</div>

				<div
					id="currently-playing-container"
					class="quadrant"
					:class="{ 'no-currently-playing': noSong }"
				>
					<currently-playing v-if="!noSong" />
					<p v-else class="nothing-here-text">
						No song is currently playing
					</p>
				</div>
			</div>

			<song-queue v-if="modals.addSongToQueue" />
			<edit-playlist v-if="modals.editPlaylist" />
			<create-playlist v-if="modals.createPlaylist" />
			<edit-station v-if="modals.editStation" store="station" />
			<report v-if="modals.report" />
		</div>

		<main-footer v-if="exists" />

		<floating-box id="player-debug-box" ref="playerDebugBox">
			<template #body>
				<span><b>YouTube id</b>: {{ currentSong.songId }}</span>
				<span><b>Duration</b>: {{ currentSong.duration }}</span>
				<span
					><b>Skip duration</b>: {{ currentSong.skipDuration }}</span
				>
				<span><b>Can autoplay</b>: {{ canAutoplay }}</span>
				<span
					><b>Attempts to play video</b>:
					{{ attemptsToPlayVideo }}</span
				>
				<span
					><b>Last time requested if can autoplay</b>:
					{{ lastTimeRequestedIfCanAutoplay }}</span
				>
				<span><b>Loading</b>: {{ loading }}</span>
				<span><b>Playback rate</b>: {{ playbackRate }}</span>
				<span><b>Player ready</b>: {{ playerReady }}</span>
				<span><b>Ready</b>: {{ ready }}</span>
				<span><b>Seeking</b>: {{ seeking }}</span>
				<span><b>System difference</b>: {{ systemDifference }}</span>
				<span><b>Time before paused</b>: {{ timeBeforePause }}</span>
				<span><b>Time elapsed</b>: {{ timeElapsed }}</span>
				<span><b>Time paused</b>: {{ timePaused }}</span>
				<span><b>Volume slider value</b>: {{ volumeSliderValue }}</span>
				<span><b>Local paused</b>: {{ localPaused }}</span>
				<span><b>No song</b>: {{ noSong }}</span>
				<span
					><b>Private playlist queue selected</b>:
					{{ privatePlaylistQueueSelected }}</span
				>
				<span><b>Station paused</b>: {{ stationPaused }}</span>
				<span
					><b>Station Genres</b>:
					{{ station.genres.join(", ") }}</span
				>
				<span
					><b>Station Blacklisted Genres</b>:
					{{ station.blacklistedGenres.join(", ") }}</span
				>
			</template>
		</floating-box>

		<Z404 v-if="!exists"></Z404>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import Toast from "toasters";

import MainHeader from "../../components/layout/MainHeader.vue";
import MainFooter from "../../components/layout/MainFooter.vue";

import Z404 from "../404.vue";

import FloatingBox from "../../components/ui/FloatingBox.vue";
import AddToPlaylistDropdown from "./components/AddToPlaylistDropdown.vue";

import io from "../../io";
import keyboardShortcuts from "../../keyboardShortcuts";
import utils from "../../../js/utils";

import CurrentlyPlaying from "./components/CurrentlyPlaying.vue";
import StationSidebar from "./components/Sidebar/index.vue";

export default {
	components: {
		MainHeader,
		MainFooter,
		SongQueue: () => import("./AddSongToQueue.vue"),
		EditPlaylist: () => import("../../components/modals/EditPlaylist.vue"),
		CreatePlaylist: () =>
			import("../../components/modals/CreatePlaylist.vue"),
		EditStation: () => import("../../components/modals/EditStation.vue"),
		Report: () => import("./Report.vue"),
		Z404,
		FloatingBox,
		CurrentlyPlaying,
		StationSidebar,
		AddToPlaylistDropdown
	},
	data() {
		return {
			utils,
			title: "Station",
			loading: true,
			ready: false,
			exists: true,
			playerReady: false,
			player: undefined,
			timePaused: 0,
			muted: false,
			timeElapsed: "0:00",
			liked: false,
			disliked: false,
			timeBeforePause: 0,
			skipVotes: 0,
			automaticallyRequestedSongId: null,
			systemDifference: 0,
			attemptsToPlayVideo: 0,
			canAutoplay: true,
			lastTimeRequestedIfCanAutoplay: 0,
			seeking: false,
			playbackRate: 1,
			volumeSliderValue: 0,
			showPlaylistDropdown: false
		};
	},
	computed: {
		...mapState("modals", {
			modals: state => state.modals.station
		}),
		...mapState("station", {
			station: state => state.station,
			currentSong: state => state.currentSong,
			songsList: state => state.songsList,
			stationPaused: state => state.stationPaused,
			localPaused: state => state.localPaused,
			noSong: state => state.noSong,
			privatePlaylistQueueSelected: state =>
				state.privatePlaylistQueueSelected
		}),
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			userId: state => state.user.auth.userId,
			role: state => state.user.auth.role
		})
	},
	mounted() {
		window.scrollTo(0, 0);

		Date.currently = () => {
			return new Date().getTime() + this.systemDifference;
		};

		this.stationName = this.$route.params.id;

		window.stationInterval = 0;

		io.getSocket(socket => {
			this.socket = socket;

			if (this.socket.connected) this.join();
			io.onConnect(this.join);
			this.socket.emit("stations.existsByName", this.stationName, res => {
				if (res.status === "failure" || !res.exists) {
					this.loading = false;
					this.exists = false;
				}
			});
			this.socket.on("event:songs.next", data => {
				const previousSong = this.currentSong.songId
					? this.currentSong
					: null;

				this.updatePreviousSong(previousSong);

				const { currentSong } = data;

				if (currentSong && !currentSong.thumbnail)
					currentSong.ytThumbnail = `https://img.youtube.com/vi/${currentSong.songId}/mqdefault.jpg`;

				this.updateCurrentSong(currentSong || {});

				this.startedAt = data.startedAt;
				this.updateStationPaused(data.paused);
				this.timePaused = data.timePaused;

				if (currentSong) {
					this.updateNoSong(false);
					if (this.currentSong.artists)
						this.currentSong.artists = this.currentSong.artists.join(
							", "
						);
					if (!this.playerReady) this.youtubeReady();
					else this.playVideo();
					this.socket.emit(
						"songs.getOwnSongRatings",
						data.currentSong.songId,
						song => {
							if (this.currentSong.songId === song.songId) {
								this.liked = song.liked;
								this.disliked = song.disliked;
								if (
									this.autoSkipDisliked &&
									song.disliked === true
								)
									this.voteSkipStation();
							}
						}
					);
				} else {
					if (this.playerReady) this.player.pauseVideo();
					this.updateNoSong(true);
				}

				let isInQueue = false;
				this.songsList.forEach(queueSong => {
					if (queueSong.requestedBy === this.userId) isInQueue = true;
				});
				if (
					!isInQueue &&
					this.privatePlaylistQueueSelected &&
					(this.automaticallyRequestedSongId !==
						this.currentSong.songId ||
						!this.currentSong.songId)
				) {
					this.addFirstPrivatePlaylistSongToQueue();
				}
			});

			this.socket.on("event:stations.pause", data => {
				this.pausedAt = data.pausedAt;
				this.updateStationPaused(true);
				this.pauseLocalPlayer();
			});

			this.socket.on("event:stations.resume", data => {
				this.timePaused = data.timePaused;
				this.updateStationPaused(false);
				if (!this.localPaused) this.resumeLocalPlayer();
			});

			this.socket.on("event:stations.remove", () => {
				window.location.href = "/";
				return true;
			});

			this.socket.on("event:song.like", data => {
				if (!this.noSong) {
					if (data.songId === this.currentSong.songId) {
						this.currentSong.dislikes = data.dislikes;
						this.currentSong.likes = data.likes;
					}
				}
			});

			this.socket.on("event:song.dislike", data => {
				if (!this.noSong) {
					if (data.songId === this.currentSong.songId) {
						this.currentSong.dislikes = data.dislikes;
						this.currentSong.likes = data.likes;
					}
				}
			});

			this.socket.on("event:song.unlike", data => {
				if (!this.noSong) {
					if (data.songId === this.currentSong.songId) {
						this.currentSong.dislikes = data.dislikes;
						this.currentSong.likes = data.likes;
					}
				}
			});

			this.socket.on("event:song.undislike", data => {
				if (!this.noSong) {
					if (data.songId === this.currentSong.songId) {
						this.currentSong.dislikes = data.dislikes;
						this.currentSong.likes = data.likes;
					}
				}
			});

			this.socket.on("event:song.newRatings", data => {
				if (!this.noSong) {
					if (data.songId === this.currentSong.songId) {
						this.liked = data.liked;
						this.disliked = data.disliked;
					}
				}
			});

			this.socket.on("event:queue.update", queue => {
				if (this.station.type === "community")
					this.updateSongsList(queue);
			});

			this.socket.on("event:song.voteSkipSong", () => {
				if (this.currentSong) this.currentSong.skipVotes += 1;
			});

			this.socket.on("event:privatePlaylist.selected", playlistId => {
				if (this.station.type === "community") {
					this.station.privatePlaylist = playlistId;
				}
			});

			this.socket.on("event:privatePlaylist.deselected", () => {
				if (this.station.type === "community") {
					this.station.privatePlaylist = null;
				}
			});

			this.socket.on("event:partyMode.updated", partyMode => {
				if (this.station.type === "community") {
					this.station.partyMode = partyMode;
				}
			});

			this.socket.on("event:newOfficialPlaylist", playlist => {
				if (this.station.type === "official") {
					this.updateSongsList(playlist);
				}
			});

			this.socket.on("event:users.updated", users => {
				this.updateUsers(users);
			});

			this.socket.on("event:userCount.updated", userCount => {
				this.updateUserCount(userCount);
			});

			this.socket.on("event:queueLockToggled", locked => {
				this.station.locked = locked;
			});

			this.socket.on("event:user.favoritedStation", stationId => {
				if (stationId === this.station._id)
					this.updateIfStationIsFavorited({ isFavorited: true });
			});

			this.socket.on("event:user.unfavoritedStation", stationId => {
				if (stationId === this.station._id)
					this.updateIfStationIsFavorited({ isFavorited: false });
			});
		});

		if (JSON.parse(localStorage.getItem("muted"))) {
			this.muted = true;
			this.player.setVolume(0);
			this.volumeSliderValue = 0 * 100;
		} else {
			let volume = parseFloat(localStorage.getItem("volume"));
			volume =
				typeof volume === "number" && !Number.isNaN(volume)
					? volume
					: 20;
			localStorage.setItem("volume", volume);
			this.volumeSliderValue = volume * 100;
		}
	},
	beforeDestroy() {
		/** Reset Songslist */
		this.updateSongsList([]);

		const shortcutNames = [
			"station.pauseResume",
			"station.skipStation",
			"station.lowerVolumeLarge",
			"station.lowerVolumeSmall",
			"station.increaseVolumeLarge",
			"station.increaseVolumeSmall",
			"station.toggleDebug"
		];

		shortcutNames.forEach(shortcutName => {
			keyboardShortcuts.unregisterShortcut(shortcutName);
		});
	},
	methods: {
		isOwnerOnly() {
			return this.loggedIn && this.userId === this.station.owner;
		},
		isAdminOnly() {
			return this.loggedIn && this.role === "admin";
		},
		isOwnerOrAdmin() {
			return this.isOwnerOnly() || this.isAdminOnly();
		},
		openSettings() {
			this.editStation({
				_id: this.station._id,
				name: this.station.name,
				type: this.station.type,
				partyMode: this.station.partyMode,
				description: this.station.description,
				privacy: this.station.privacy,
				displayName: this.station.displayName,
				locked: this.station.locked,
				genres: this.station.genres,
				blacklistedGenres: this.station.blacklistedGenres
			});
			this.openModal({
				sector: "station",
				modal: "editStation"
			});
		},
		removeFromQueue(songId) {
			window.socket.emit(
				"stations.removeFromQueue",
				this.station._id,
				songId,
				res => {
					if (res.status === "success") {
						new Toast({
							content:
								"Successfully removed song from the queue.",
							timeout: 4000
						});
					} else new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		youtubeReady() {
			if (!this.player) {
				this.player = new window.YT.Player("player", {
					height: 270,
					width: 480,
					videoId: this.currentSong.songId,
					host: "https://www.youtube-nocookie.com",
					startSeconds:
						this.getTimeElapsed() / 1000 +
						this.currentSong.skipDuration,
					playerVars: {
						controls: 0,
						iv_load_policy: 3,
						rel: 0,
						showinfo: 0
					},
					events: {
						onReady: () => {
							this.playerReady = true;
							let volume = parseInt(
								localStorage.getItem("volume")
							);

							volume = typeof volume === "number" ? volume : 20;

							this.player.setVolume(volume);

							if (volume > 0) {
								this.player.unMute();
							}

							if (this.muted) this.player.mute();

							this.playVideo();
						},
						onError: err => {
							console.log("iframe error", err);
							if (this.loggedIn) this.voteSkipStation();
						},
						onStateChange: event => {
							if (
								event.data === window.YT.PlayerState.PLAYING &&
								this.videoLoading === true
							) {
								this.videoLoading = false;
								this.player.seekTo(
									this.getTimeElapsed() / 1000 +
										this.currentSong.skipDuration,
									true
								);
								if (this.localPaused || this.stationPaused)
									this.player.pauseVideo();
							} else if (
								event.data === window.YT.PlayerState.PLAYING &&
								(this.localPaused || this.stationPaused)
							) {
								this.player.seekTo(
									this.timeBeforePause / 1000,
									true
								);
								this.player.pauseVideo();
							} else if (
								event.data === window.YT.PlayerState.PLAYING &&
								this.seeking === true
							) {
								this.seeking = false;
							}
							if (
								event.data === window.YT.PlayerState.PAUSED &&
								!this.localPaused &&
								!this.stationPaused &&
								!this.noSong &&
								this.player.getDuration() / 1000 <
									this.currentSong.duration
							) {
								this.player.seekTo(
									this.getTimeElapsed() / 1000 +
										this.currentSong.skipDuration,
									true
								);
								this.player.playVideo();
							}
						}
					}
				});
			}
		},
		getTimeElapsed() {
			if (this.currentSong) {
				let { timePaused } = this;
				if (this.stationPaused)
					timePaused += Date.currently() - this.pausedAt;
				return Date.currently() - this.startedAt - timePaused;
			}
			return 0;
		},
		playVideo() {
			if (this.playerReady) {
				this.videoLoading = true;
				this.player.loadVideoById(
					this.currentSong.songId,
					this.getTimeElapsed() / 1000 + this.currentSong.skipDuration
				);

				if (window.stationInterval !== 0)
					clearInterval(window.stationInterval);
				window.stationInterval = setInterval(() => {
					this.resizeSeekerbar();
					this.calculateTimeElapsed();
				}, 150);
			}
		},
		resizeSeekerbar() {
			if (!this.stationPaused) {
				document.getElementById(
					"seeker-bar"
				).style.width = `${parseFloat(
					(this.getTimeElapsed() / 1000 / this.currentSong.duration) *
						100
				)}%`;
			}
		},
		calculateTimeElapsed() {
			if (
				this.playerReady &&
				this.currentSong &&
				this.player.getPlayerState() === -1
			) {
				if (this.attemptsToPlayVideo >= 5) {
					if (
						Date.now() - this.lastTimeRequestedIfCanAutoplay >
						2000
					) {
						this.lastTimeRequestedIfCanAutoplay = Date.now();
						window.canAutoplay.video().then(({ result }) => {
							if (result) {
								this.attemptsToPlayVideo = 0;
								this.canAutoplay = true;
							} else {
								this.canAutoplay = false;
							}
						});
					}
				} else {
					this.player.playVideo();
					this.attemptsToPlayVideo += 1;
				}
			}

			if (!this.stationPaused && !this.localPaused) {
				const timeElapsed = this.getTimeElapsed();
				const currentPlayerTime =
					Math.max(
						this.player.getCurrentTime() -
							this.currentSong.skipDuration,
						0
					) * 1000;

				const difference = timeElapsed - currentPlayerTime;
				// console.log(difference);

				let playbackRate = 1;

				if (difference < -2000) {
					if (!this.seeking) {
						this.seeking = true;
						this.player.seekTo(
							this.getTimeElapsed() / 1000 +
								this.currentSong.skipDuration
						);
					}
				} else if (difference < -200) {
					// console.log("Difference0.8");
					playbackRate = 0.8;
				} else if (difference < -50) {
					// console.log("Difference0.9");
					playbackRate = 0.9;
				} else if (difference < -25) {
					// console.log("Difference0.99");
					playbackRate = 0.95;
				} else if (difference > 2000) {
					if (!this.seeking) {
						this.seeking = true;
						this.player.seekTo(
							this.getTimeElapsed() / 1000 +
								this.currentSong.skipDuration
						);
					}
				} else if (difference > 200) {
					// console.log("Difference1.2");
					playbackRate = 1.2;
				} else if (difference > 50) {
					// console.log("Difference1.1");
					playbackRate = 1.1;
				} else if (difference > 25) {
					// console.log("Difference1.01");
					playbackRate = 1.05;
				} else if (this.player.getPlaybackRate !== 1.0) {
					// console.log("NDifference1.0");
					this.player.setPlaybackRate(1.0);
				}

				if (this.playbackRate !== playbackRate) {
					this.player.setPlaybackRate(playbackRate);
					this.playbackRate = playbackRate;
				}
			}

			/* if (this.currentTime !== undefined && this.paused) {
				this.timePaused += Date.currently() - this.currentTime;
				this.currentTime = undefined;
			} */

			let { timePaused } = this;
			if (this.stationPaused)
				timePaused += Date.currently() - this.pausedAt;

			const duration =
				(Date.currently() - this.startedAt - timePaused) / 1000;

			const songDuration = this.currentSong.duration;
			if (songDuration <= duration) this.player.pauseVideo();
			if (!this.stationPaused && duration <= songDuration)
				this.timeElapsed = utils.formatTime(duration);
		},
		toggleLock() {
			window.socket.emit("stations.toggleLock", this.station._id, res => {
				if (res.status === "success") {
					new Toast({
						content: "Successfully toggled the queue lock.",
						timeout: 4000
					});
				} else new Toast({ content: res.message, timeout: 8000 });
			});
		},
		changeVolume() {
			const volume = this.volumeSliderValue;
			localStorage.setItem("volume", volume / 100);
			if (this.playerReady) {
				this.player.setVolume(volume / 100);
				if (volume > 0) {
					this.player.unMute();
					localStorage.setItem("muted", false);
					this.muted = false;
				}
			}
		},
		resumeLocalStation() {
			this.updateLocalPaused(false);
			if (!this.stationPaused) this.resumeLocalPlayer();
		},
		pauseLocalStation() {
			this.updateLocalPaused(true);
			this.pauseLocalPlayer();
		},
		resumeLocalPlayer() {
			if (!this.noSong) {
				if (this.playerReady) {
					this.player.seekTo(
						this.getTimeElapsed() / 1000 +
							this.currentSong.skipDuration
					);
					this.player.playVideo();
				}
			}
		},
		pauseLocalPlayer() {
			if (!this.noSong) {
				this.timeBeforePause = this.getTimeElapsed();
				if (this.playerReady) this.player.pauseVideo();
			}
		},
		skipStation() {
			this.socket.emit("stations.forceSkip", this.station._id, data => {
				if (data.status !== "success")
					new Toast({
						content: `Error: ${data.message}`,
						timeout: 8000
					});
				else
					new Toast({
						content:
							"Successfully skipped the station's current song.",
						timeout: 4000
					});
			});
		},
		voteSkipStation() {
			this.socket.emit("stations.voteSkip", this.station._id, data => {
				if (data.status !== "success")
					new Toast({
						content: `Error: ${data.message}`,
						timeout: 8000
					});
				else
					new Toast({
						content: "Successfully voted to skip the current song.",
						timeout: 4000
					});
			});
		},
		resumeStation() {
			this.socket.emit("stations.resume", this.station._id, data => {
				if (data.status !== "success")
					new Toast({
						content: `Error: ${data.message}`,
						timeout: 8000
					});
				else
					new Toast({
						content: "Successfully resumed the station.",
						timeout: 4000
					});
			});
		},
		pauseStation() {
			this.socket.emit("stations.pause", this.station._id, data => {
				if (data.status !== "success")
					new Toast({
						content: `Error: ${data.message}`,
						timeout: 8000
					});
				else
					new Toast({
						content: "Successfully paused the station.",
						timeout: 4000
					});
			});
		},
		toggleMute() {
			if (this.playerReady) {
				const previousVolume = parseFloat(
					localStorage.getItem("volume")
				);
				const volume =
					this.player.getVolume() * 100 <= 0 ? previousVolume : 0;
				this.muted = !this.muted;
				localStorage.setItem("muted", this.muted);
				this.volumeSliderValue = volume * 100;
				this.player.setVolume(volume);
				if (!this.muted) localStorage.setItem("volume", volume);
			}
		},
		increaseVolume() {
			if (this.playerReady) {
				const previousVolume = parseInt(localStorage.getItem("volume"));
				let volume = previousVolume + 5;
				if (previousVolume === 0) {
					this.muted = false;
					localStorage.setItem("muted", false);
				}
				if (volume > 100) volume = 100;
				this.volumeSliderValue = volume * 100;
				this.player.setVolume(volume);
				localStorage.setItem("volume", volume);
			}
		},
		toggleLike() {
			if (this.liked)
				this.socket.emit(
					"songs.unlike",
					this.currentSong.songId,
					data => {
						if (data.status !== "success")
							new Toast({
								content: `Error: ${data.message}`,
								timeout: 8000
							});
					}
				);
			else
				this.socket.emit(
					"songs.like",
					this.currentSong.songId,
					data => {
						if (data.status !== "success")
							new Toast({
								content: `Error: ${data.message}`,
								timeout: 8000
							});
					}
				);
		},
		toggleDislike() {
			if (this.disliked)
				return this.socket.emit(
					"songs.undislike",
					this.currentSong.songId,
					data => {
						if (data.status !== "success")
							new Toast({
								content: `Error: ${data.message}`,
								timeout: 8000
							});
					}
				);

			return this.socket.emit(
				"songs.dislike",
				this.currentSong.songId,
				data => {
					if (data.status !== "success")
						new Toast({
							content: `Error: ${data.message}`,
							timeout: 8000
						});
				}
			);
		},
		addFirstPrivatePlaylistSongToQueue() {
			let isInQueue = false;
			if (
				this.station.type === "community" &&
				this.station.partyMode === true
			) {
				this.songsList.forEach(queueSong => {
					if (queueSong.requestedBy === this.userId) isInQueue = true;
				});
				if (!isInQueue && this.privatePlaylistQueueSelected) {
					this.socket.emit(
						"playlists.getFirstSong",
						this.privatePlaylistQueueSelected,
						data => {
							if (data.status === "success") {
								if (data.song) {
									if (data.song.duration < 15 * 60) {
										this.automaticallyRequestedSongId =
											data.song.songId;
										this.socket.emit(
											"stations.addToQueue",
											this.station._id,
											data.song.songId,
											data2 => {
												if (
													data2.status === "success"
												) {
													this.socket.emit(
														"playlists.moveSongToBottom",
														this
															.privatePlaylistQueueSelected,
														data.song.songId,
														data3 => {
															if (
																data3.status ===
																"success"
															) {
																console.log(
																	"This comment is just here because of eslint/prettier issues, ignore it"
																);
															}
														}
													);
												}
											}
										);
									} else {
										new Toast({
											content: `Top song in playlist was too long to be added.`,
											timeout: 3000
										});
										this.socket.emit(
											"playlists.moveSongToBottom",
											this.privatePlaylistQueueSelected,
											data.song.songId,
											data3 => {
												if (
													data3.status === "success"
												) {
													setTimeout(() => {
														this.addFirstPrivatePlaylistSongToQueue();
													}, 3000);
												}
											}
										);
									}
								} else {
									new Toast({
										content: `Selected playlist has no songs.`,
										timeout: 4000
									});
								}
							}
						}
					);
				}
			}
		},
		togglePlayerDebugBox() {
			this.$refs.playerDebugBox.toggleBox();
		},
		resetPlayerDebugBox() {
			this.$refs.playerDebugBox.resetBox();
		},
		join() {
			this.socket.emit("stations.join", this.stationName, res => {
				if (res.status === "success") {
					this.loading = false;

					const {
						_id,
						displayName,
						description,
						privacy,
						locked,
						partyMode,
						owner,
						privatePlaylist,
						type,
						genres,
						blacklistedGenres,
						isFavorited
					} = res.data;

					this.joinStation({
						_id,
						name: this.stationName,
						displayName,
						description,
						privacy,
						locked,
						partyMode,
						owner,
						privatePlaylist,
						type,
						genres,
						blacklistedGenres,
						isFavorited
					});

					const currentSong = res.data.currentSong
						? res.data.currentSong
						: {};

					if (currentSong.artists)
						currentSong.artists = currentSong.artists.join(", ");

					if (currentSong && !currentSong.thumbnail)
						currentSong.ytThumbnail = `https://img.youtube.com/vi/${currentSong.songId}/mqdefault.jpg`;

					this.updateCurrentSong(currentSong);

					this.startedAt = res.data.startedAt;
					this.updateStationPaused(res.data.paused);
					this.timePaused = res.data.timePaused;
					this.updateUserCount(res.data.userCount);
					this.updateUsers(res.data.users);
					this.pausedAt = res.data.pausedAt;

					if (res.data.currentSong) {
						this.updateNoSong(false);
						this.youtubeReady();
						this.playVideo();
						this.socket.emit(
							"songs.getOwnSongRatings",
							res.data.currentSong.songId,
							data => {
								if (this.currentSong.songId === data.songId) {
									this.liked = data.liked;
									this.disliked = data.disliked;
								}
							}
						);
					} else {
						if (this.playerReady) this.player.pauseVideo();
						this.updateNoSong(true);
					}

					if (type === "community" && partyMode === true) {
						this.socket.emit("stations.getQueue", _id, res => {
							if (res.status === "success") {
								this.updateSongsList(res.queue);
							}
						});
					}

					if (this.isOwnerOrAdmin()) {
						keyboardShortcuts.registerShortcut(
							"station.pauseResume",
							{
								keyCode: 32,
								shift: false,
								ctrl: true,
								preventDefault: true,
								handler: () => {
									if (this.stationPaused)
										this.resumeStation();
									else this.pauseStation();
								}
							}
						);

						keyboardShortcuts.registerShortcut(
							"station.skipStation",
							{
								keyCode: 39,
								shift: false,
								ctrl: true,
								preventDefault: true,
								handler: () => {
									this.skipStation();
								}
							}
						);
					}

					keyboardShortcuts.registerShortcut(
						"station.lowerVolumeLarge",
						{
							keyCode: 40,
							shift: false,
							ctrl: true,
							preventDefault: true,
							handler: () => {
								this.volumeSliderValue -= 1000;
								this.changeVolume();
							}
						}
					);

					keyboardShortcuts.registerShortcut(
						"station.lowerVolumeSmall",
						{
							keyCode: 40,
							shift: true,
							ctrl: true,
							preventDefault: true,
							handler: () => {
								this.volumeSliderValue -= 100;
								this.changeVolume();
							}
						}
					);

					keyboardShortcuts.registerShortcut(
						"station.increaseVolumeLarge",
						{
							keyCode: 38,
							shift: false,
							ctrl: true,
							preventDefault: true,
							handler: () => {
								this.volumeSliderValue += 1000;
								this.changeVolume();
							}
						}
					);

					keyboardShortcuts.registerShortcut(
						"station.increaseVolumeSmall",
						{
							keyCode: 38,
							shift: true,
							ctrl: true,
							preventDefault: true,
							handler: () => {
								this.volumeSliderValue += 100;
								this.changeVolume();
							}
						}
					);

					keyboardShortcuts.registerShortcut("station.toggleDebug", {
						keyCode: 68,
						shift: false,
						ctrl: true,
						preventDefault: true,
						handler: () => {
							this.togglePlayerDebugBox();
						}
					});

					// UNIX client time before ping
					const beforePing = Date.now();
					this.socket.emit("apis.ping", pong => {
						// UNIX client time after ping
						const afterPing = Date.now();
						// Average time in MS it took between the server responding and the client receiving
						const connectionLatency = (afterPing - beforePing) / 2;
						console.log(connectionLatency, beforePing - afterPing);
						// UNIX server time
						const serverDate = pong.date;
						// Difference between the server UNIX time and the client UNIX time after ping, with the connectionLatency added to the server UNIX time
						const difference =
							serverDate + connectionLatency - afterPing;
						console.log("Difference: ", difference);
						if (difference > 3000 || difference < -3000) {
							console.log(
								"System time difference is bigger than 3 seconds."
							);
						}
						this.systemDifference = difference;
					});
				} else {
					this.loading = false;
					this.exists = false;
				}
			});
		},
		favoriteStation() {
			this.socket.emit(
				"stations.favoriteStation",
				this.station._id,
				res => {
					if (res.status === "success") {
						new Toast({
							content: "Successfully favorited station.",
							timeout: 4000
						});
					} else new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		unfavoriteStation() {
			this.socket.emit(
				"stations.unfavoriteStation",
				this.station._id,
				res => {
					if (res.status === "success") {
						new Toast({
							content: "Successfully unfavorited station.",
							timeout: 4000
						});
					} else new Toast({ content: res.message, timeout: 8000 });
				}
			);
		},
		...mapActions("modals", ["openModal"]),
		...mapActions("station", [
			"joinStation",
			"updateUserCount",
			"updateUsers",
			"updateCurrentSong",
			"updatePreviousSong",
			"updateSongsList",
			"updateStationPaused",
			"updateLocalPaused",
			"updateNoSong",
			"editStation",
			"updateIfStationIsFavorited"
		])
	}
};
</script>

<style lang="scss" scoped>
@import "../../styles/global.scss";
.progress {
	width: 50px;
	animation: rotate 0.8s infinite linear;
	border: 8px solid $primary-color;
	border-right-color: transparent;
	height: 50px;
	position: absolute;
	top: 50%;
	left: 50%;
}

@keyframes rotate {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.experimental {
	display: none !important;
}

#player-debug-box {
	.box-body {
		flex-direction: column;

		b {
			color: #000;
		}
	}
}

.night-mode {
	#currently-playing-container,
	#about-station-container,
	#control-bar-container,
	.player-container.nothing-here-text {
		background-color: $night-mode-bg-secondary !important;
	}

	#video-container,
	#control-bar-container {
		border: 0 !important;
	}

	#dropdown-toggle {
		background-color: $dark-grey !important;
		border: 0;

		i {
			color: #fff;
		}
	}
}

#station-outer-container {
	margin: 0 auto;
	padding: 20px 40px;
	height: 100%;
	width: 100%;
	max-width: 2000px;

	@media (max-width: 1040px) {
		padding: 0;
		margin-top: 0 !important;
		height: auto !important;

		#station-inner-container.nothing-here {
			grid-template-areas:
				"about-station"
				"player"
				"sidebar" !important;
			grid-template-rows: min-content 50px auto !important;
		}

		#station-inner-container {
			grid-template-columns: 100% !important;
			grid-template-areas:
				"about-station"
				"player"
				"currently-playing"
				"sidebar" !important;
			grid-template-rows: auto !important;
		}

		.quadrant,
		.player-container {
			border: 0 !important;
		}

		.quadrant,
		.player-container {
			background: transparent !important;
		}

		/** padding fixes on mobile */
		#about-station-container {
			margin-top: 30px;
			padding: 0 10px !important;
		}

		#currently-playing-container {
			padding: 0 10px !important;

			#currently-playing {
				padding: 0;
			}
		}

		#sidebar-container {
			padding: 0 10px !important;
			max-height: 500px !important;
			min-height: 250px;
		}

		/** Change height of YouTube embed  */
		.player-container:not(.nothing-here-text) {
			height: 500px !important;
		}

		/** mainly irrelevant on mobile */
		.no-currently-playing {
			display: none !important;
		}
	}

	#station-inner-container {
		display: grid;
		height: 100%;
		width: 100%;
		grid-template-columns: 70% 30%;
		grid-template-rows: 150px auto;
		grid-template-areas:
			"about-station currently-playing"
			"player sidebar";
		gap: 25px;
		min-height: calc(100vh - 64px - 190px);

		@media (min-width: 1040px) and (max-width: 2100px) {
			#control-bar-container {
				.optional-desktop-only-text {
					display: none;
				}

				.button:not(#dropdown-toggle) {
					width: 75px;
				}

				#add-song-to-playlist .button,
				#local-resume,
				#local-pause {
					i {
						margin-right: 0 !important;
					}
				}
			}
		}

		.row {
			display: flex;
			flex-direction: row;
			max-width: 100%;
		}

		.column {
			display: flex;
			flex-direction: column;
		}

		.quadrant {
			border-radius: 5px;
		}

		.quadrant:not(#sidebar-container) {
			background-color: #fff;
			border: 1px solid $light-grey-2;
		}

		#about-station-container {
			align-items: flex-start;
			padding: 20px;
			grid-area: about-station;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;

			#station-info {
				flex-grow: 1;

				#station-name {
					flex-direction: row !important;

					h1 {
						margin: 0;
						font-size: 36px;
						line-height: 0.8;
					}

					i {
						margin-left: 10px;
						font-size: 30px;
						color: $yellow;
					}
				}

				p {
					max-width: 700px;
					flex-grow: 1;
				}
			}

			@media (max-width: 450px) {
				#admin-buttons .optional-desktop-only-text {
					display: none;
				}
			}
		}

		#currently-playing-container {
			grid-area: currently-playing;
			margin-right: 25px;

			.nothing-here-text {
				height: 100%;
			}
		}

		.player-container {
			height: inherit;
			background-color: #fff;
			display: flex;
			flex-direction: column;
			border: 1px solid $light-grey-2;
			border-radius: 5px;
			overflow: hidden;
			grid-area: player;

			&.nothing-here-text {
				border: 1px solid $light-grey-2;
				border-radius: 5px;
			}

			#video-container {
				width: 100%;
				height: 100%;

				.player-cannot-autoplay {
					position: relative;
					width: 100%;
					height: 100%;
					bottom: calc(100% + 5px);
					background: rgba(3, 169, 244, 0.95);
					display: flex;
					align-items: center;
					justify-content: center;

					p {
						color: $white;
						font-size: 26px;
						text-align: center;
					}
				}
			}

			#seeker-bar-container {
				background-color: #fff;
				position: relative;
				height: 7px;
				display: block;
				width: 100%;
				overflow: hidden;

				#seeker-bar {
					background-color: $musare-blue;
					top: 0;
					left: 0;
					bottom: 0;
					position: absolute;
				}
			}

			#control-bar-container {
				display: flex;
				justify-content: space-around;
				padding: 10px 0;
				width: 100%;
				background: #fff;
				flex-direction: column;
				flex-flow: wrap;

				#left-buttons,
				#right-buttons {
					margin: 3px;

					i {
						margin-right: 3px;
					}
				}

				#left-buttons {
					display: flex;

					.button:not(:first-of-type) {
						margin-left: 5px;
					}
				}

				#duration {
					margin: 3px;
					display: flex;
					align-items: center;

					p {
						font-size: 22px;
						/** prevents duration width slightly varying and shifting other controls slightly */
						width: 125px;
						text-align: center;
					}
				}

				#volume-control {
					margin: 3px;
					margin-top: 0;
					position: relative;
					display: flex;
					align-items: center;
					cursor: pointer;

					.volume-slider {
						width: 500px;
						padding: 0 15px;
						background: transparent;

						@media (max-width: 2150px) {
							width: 250px !important;
						}
					}

					input[type="range"] {
						-webkit-appearance: none;
						margin: 7.3px 0;
					}

					input[type="range"]:focus {
						outline: none;
					}

					input[type="range"]::-webkit-slider-runnable-track {
						width: 100%;
						height: 5.2px;
						cursor: pointer;
						box-shadow: 0;
						background: $light-grey-2;
						border-radius: 0;
						border: 0;
					}

					input[type="range"]::-webkit-slider-thumb {
						box-shadow: 0;
						border: 0;
						height: 19px;
						width: 19px;
						border-radius: 15px;
						background: $primary-color;
						cursor: pointer;
						-webkit-appearance: none;
						margin-top: -6.5px;
					}

					input[type="range"]::-moz-range-track {
						width: 100%;
						height: 5.2px;
						cursor: pointer;
						box-shadow: 0;
						background: $light-grey-2;
						border-radius: 0;
						border: 0;
					}

					input[type="range"]::-moz-range-thumb {
						box-shadow: 0;
						border: 0;
						height: 19px;
						width: 19px;
						border-radius: 15px;
						background: $primary-color;
						cursor: pointer;
						-webkit-appearance: none;
						margin-top: -6.5px;
					}
					input[type="range"]::-ms-track {
						width: 100%;
						height: 5.2px;
						cursor: pointer;
						box-shadow: 0;
						background: $light-grey-2;
						border-radius: 1.3px;
					}

					input[type="range"]::-ms-fill-lower {
						background: $light-grey-2;
						border: 0;
						border-radius: 0;
						box-shadow: 0;
					}

					input[type="range"]::-ms-fill-upper {
						background: $light-grey-2;
						border: 0;
						border-radius: 0;
						box-shadow: 0;
					}

					input[type="range"]::-ms-thumb {
						box-shadow: 0;
						border: 0;
						height: 15px;
						width: 15px;
						border-radius: 15px;
						background: $primary-color;
						cursor: pointer;
						-webkit-appearance: none;
						margin-top: 1.5px;
					}
				}

				#right-buttons {
					display: flex;

					#dropdown-toggle {
						width: 35px;
					}

					#dislike-song,
					#add-song-to-playlist .button:not(#dropdown-toggle) {
						margin-left: 5px;
					}

					#ratings {
						display: flex;
						margin-right: 5px;

						#like-song:hover,
						#like-song.liked {
							background-color: darken($green, 5%) !important;
						}

						#dislike-song:hover,
						#dislike-song.disliked {
							background-color: darken($red, 5%) !important;
						}

						&.liked #dislike-song,
						&.disliked #like-song {
							background-color: $grey !important;
							&:hover {
								background-color: darken($grey, 5%) !important;
							}
						}
					}

					#add-song-to-playlist {
						display: flex;
						flex-direction: column-reverse;
						align-items: center;
						width: 212px;

						.control {
							width: fit-content;
							margin-bottom: 0 !important;
						}
					}
				}
			}
		}

		#sidebar-container {
			border-top: 0;
			position: relative;
			height: inherit;
			grid-area: sidebar;
			margin-right: 25px;
		}
	}
}

.footer {
	margin-top: 30px;
}

/deep/ .nothing-here-text {
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
