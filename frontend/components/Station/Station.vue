<template>
	<div>
		<metadata v-bind:title="`${station.displayName}`" />

		<station-header />

		<song-queue v-if="modals.addSongToQueue" />
		<add-to-playlist v-if="modals.addSongToPlaylist" />
		<edit-playlist v-if="modals.editPlaylist" />
		<create-playlist v-if="modals.createPlaylist" />
		<edit-station v-show="modals.editStation" />
		<report v-if="modals.report" />

		<transition name="slide">
			<songs-list-sidebar v-if="sidebars.songslist" />
		</transition>
		<transition name="slide">
			<playlist-sidebar v-if="sidebars.playlist" />
		</transition>
		<transition name="slide">
			<users-sidebar v-if="sidebars.users" />
		</transition>

		<div v-show="loading" class="progress" />
		<div v-show="!loading && exists" class="station">
			<div v-show="noSong" class="no-song">
				<h1>No song is currently playing</h1>
				<h4
					v-if="
						station.type === 'community' &&
							station.partyMode &&
							this.loggedIn &&
							(!station.locked ||
								(station.locked &&
									this.userId === station.owner))
					"
				>
					<a
						href="#"
						class="no-song"
						@click="
							openModal({
								sector: 'station',
								modal: 'addSongToQueue'
							})
						"
						>Add a song to the queue</a
					>
				</h4>
				<h4
					v-if="
						station.type === 'community' &&
							!station.partyMode &&
							this.userId === station.owner &&
							!station.privatePlaylist
					"
				>
					<a
						href="#"
						class="no-song"
						@click="sidebars.playlist = true"
						>Play a private playlist</a
					>
				</h4>
				<h1
					v-if="
						station.type === 'community' &&
							!station.partyMode &&
							this.userId === station.owner &&
							station.privatePlaylist
					"
				>
					Maybe you can add some songs to your selected private
					playlist and then press the skip button
				</h1>
			</div>
			<div v-show="!noSong" class="columns">
				<div
					class="column is-8-desktop is-offset-2-desktop is-12-mobile"
				>
					<div class="video-container">
						<div id="player" />
						<div
							class="player-can-not-autoplay"
							v-if="!canAutoplay"
						>
							<p>
								Please click anywhere on the screen for the
								video to start
							</p>
						</div>
					</div>
					<div
						id="preview-progress"
						class="seeker-bar-container white"
					>
						<div class="seeker-bar light-blue" style="width: 0%;" />
					</div>
				</div>
				<div
					class="desktop-only column is-3-desktop card playlistCard experimental"
				>
					<div v-if="station.type === 'community'" class="title">
						Queue
					</div>
					<div v-else class="title">
						Playlist
					</div>
					<article v-if="!noSong" class="media">
						<figure class="media-left">
							<p class="image is-64x64">
								<img
									:src="currentSong.thumbnail"
									onerror="this.src='/assets/notes-transparent.png'"
								/>
							</p>
						</figure>
						<div class="media-content">
							<div class="content">
								<p>
									Current Song:
									<br />
									<strong>{{ currentSong.title }}</strong>
									<br />
									<small>{{ currentSong.artists }}</small>
								</p>
							</div>
						</div>
						<div class="media-right">
							{{ formatTime(currentSong.duration) }}
						</div>
					</article>
					<p v-if="noSong" class="center">
						There is currently no song playing.
					</p>

					<article
						v-for="(song, index) in songsList"
						:key="index"
						class="media"
					>
						<div class="media-content">
							<div class="content">
								<strong class="songTitle">{{
									song.title
								}}</strong>
								<br />
								<small>{{ song.artists.join(", ") }}</small>
								<br />
								<div v-if="station.partyMode">
									<br />
									<small>
										Requested by
										<b>
											<user-id-to-username
												:userId="song.requestedBy"
												:link="true"
											/>
										</b>
									</small>
									<button
										v-if="isOwnerOnly() || isAdminOnly()"
										class="button"
										@click="removeFromQueue(song.songId)"
									>
										REMOVE
									</button>
								</div>
							</div>
						</div>
						<div class="media-right">
							{{ formatTime(song.duration) }}
						</div>
					</article>
					<a
						v-if="station.type === 'community' && loggedIn"
						class="button add-to-queue"
						href="#"
						@click="
							openModal({
								sector: 'station',
								modal: 'addSongToQueue'
							})
						"
						>Add a song to the queue</a
					>
				</div>
			</div>
			<div v-show="!noSong" class="desktop-only columns is-mobile">
				<div
					class="column is-8-desktop is-offset-2-desktop is-12-mobile"
				>
					<div class="columns is-mobile">
						<div class="column is-12-desktop">
							<h4 id="time-display">
								{{ timeElapsed }} /
								{{ formatTime(currentSong.duration) }}
							</h4>
							<h3>{{ currentSong.title }}</h3>
							<h4 class="thin" style="margin-left: 0">
								{{ currentSong.artists }}
							</h4>
							<div class="columns is-mobile">
								<form
									style="margin-top: 12px; margin-bottom: 0;"
									action="#"
									class="column is-7-desktop is-4-mobile"
								>
									<p class="volume-slider-wrapper">
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
											id="volumeSlider"
											type="range"
											min="0"
											max="10000"
											class="active"
											@change="changeVolume()"
											@input="changeVolume()"
										/>
										<i
											class="material-icons"
											@click="increaseVolume()"
											>volume_up</i
										>
									</p>
								</form>
								<div
									class="column is-8-mobile is-5-desktop"
									style="float: right;"
								>
									<ul
										v-if="
											currentSong.likes !== -1 &&
												currentSong.dislikes !== -1
										"
										id="ratings"
									>
										<li
											id="like"
											class="right"
											@click="toggleLike()"
										>
											<span class="flow-text">{{
												currentSong.likes
											}}</span>
											<i
												id="thumbs_up"
												class="material-icons grey-text"
												:class="{ liked: liked }"
												>thumb_up</i
											>
											<a
												class="absolute-a behind"
												href="#"
												@click="toggleLike()"
											/>
										</li>
										<li
											id="dislike"
											style="margin-right: 10px;"
											class="right"
											@click="toggleDislike()"
										>
											<span class="flow-text">{{
												currentSong.dislikes
											}}</span>
											<i
												id="thumbs_down"
												class="material-icons grey-text"
												:class="{
													disliked: disliked
												}"
												>thumb_down</i
											>
											<a
												class="absolute-a behind"
												href="#"
												@click="toggleDislike()"
											/>
										</li>
									</ul>
								</div>
							</div>
						</div>
						<div
							v-if="!currentSong.simpleSong"
							class="column is-3-desktop experimental"
						>
							<img
								class="image"
								:src="currentSong.thumbnail"
								alt="Song Thumbnail"
								onerror="this.src='/assets/notes-transparent.png'"
							/>
						</div>
					</div>
				</div>
			</div>
			<div v-show="!noSong" class="mobile-only">
				<div>
					<div>
						<div>
							<h3>{{ currentSong.title }}</h3>
							<h4 class="thin">
								{{ currentSong.artists }}
							</h4>
							<h5>
								{{ timeElapsed }} /
								{{ formatTime(currentSong.duration) }}
							</h5>
							<div>
								<form class="columns" action="#">
									<p
										class="column is-11-mobile volume-slider-wrapper"
									>
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
											id="volumeSlider"
											type="range"
											min="0"
											max="10000"
											class="active"
											@change="changeVolume()"
											@input="changeVolume()"
										/>
										<i
											class="material-icons"
											@click="increaseVolume()"
											>volume_up</i
										>
									</p>
								</form>
								<div>
									<ul
										v-if="
											currentSong.likes !== -1 &&
												currentSong.dislikes !== -1
										"
										id="ratings"
										style="display: inline-block;"
									>
										<li
											id="dislike"
											style="display: inline-block;margin-right: 10px;"
											@click="toggleDislike()"
										>
											<span class="flow-text">{{
												currentSong.dislikes
											}}</span>
											<i
												id="thumbs_down"
												class="material-icons grey-text"
												:class="{
													disliked: disliked
												}"
												>thumb_down</i
											>
											<a
												class="absolute-a behind"
												href="#"
												@click="toggleDislike()"
											/>
										</li>
										<li
											id="like"
											style="display: inline-block;"
											@click="toggleLike()"
										>
											<span class="flow-text">{{
												currentSong.likes
											}}</span>
											<i
												id="thumbs_up"
												class="material-icons grey-text"
												:class="{ liked: liked }"
												>thumb_up</i
											>
											<a
												class="absolute-a behind"
												href="#"
												@click="toggleLike()"
											/>
										</li>
									</ul>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<Z404 v-if="!exists"></Z404>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import { Toast } from "vue-roaster";

import StationHeader from "./StationHeader.vue";

import UserIdToUsername from "../UserIdToUsername.vue";
import Z404 from "../404.vue";

import io from "../../io";

export default {
	data() {
		return {
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
			sidebars: {
				songslist: false,
				users: false,
				playlist: false
			},
			timeBeforePause: 0,
			skipVotes: 0,
			privatePlaylistQueueSelected: null,
			automaticallyRequestedSongId: null,
			systemDifference: 0,
			attemptsToPlayVideo: 0,
			canAutoplay: true,
			lastTimeRequestedIfCanAutoplay: 0
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
			paused: state => state.paused,
			noSong: state => state.noSong
		}),
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			userId: state => state.user.auth.userId,
			role: state => state.user.auth.role
		})
	},
	methods: {
		isOwnerOnly() {
			return this.loggedIn && this.userId === this.station.owner;
		},
		isAdminOnly() {
			return this.loggedIn && this.role === "admin";
		},
		removeFromQueue(songId) {
			window.socket.emit(
				"stations.removeFromQueue",
				this.station._id,
				songId,
				res => {
					if (res.status === "success") {
						Toast.methods.addToast(
							"Successfully removed song from the queue.",
							4000
						);
					} else Toast.methods.addToast(res.message, 8000);
				}
			);
		},
		toggleSidebar(type) {
			Object.keys(this.sidebars).forEach(sidebar => {
				if (sidebar !== type) this.sidebars[sidebar] = false;
				else this.sidebars[type] = !this.sidebars[type];
			});
		},
		youtubeReady() {
			if (!this.player) {
				this.player = new window.YT.Player("player", {
					height: 270,
					width: 480,
					videoId: this.currentSong.songId,
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
							this.voteSkipStation();
						},
						onStateChange: event => {
							if (
								event.data === 1 &&
								this.videoLoading === true
							) {
								this.videoLoading = false;
								this.player.seekTo(
									this.getTimeElapsed() / 1000 +
										this.currentSong.skipDuration,
									true
								);
								if (this.paused) this.player.pauseVideo();
							} else if (event.data === 1 && this.paused) {
								this.player.seekTo(
									this.timeBeforePause / 1000,
									true
								);
								this.player.pauseVideo();
							}
							if (
								event.data === 2 &&
								!this.paused &&
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
				if (this.paused) timePaused += Date.currently() - this.pausedAt;
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
			if (!this.paused) {
				document.getElementsByClassName(
					"seeker-bar"
				)[0].style.width = `${parseFloat(
					(this.getTimeElapsed() / 1000 / this.currentSong.duration) *
						100
				)}%`;
			}
		},
		formatTime(duration) {
			if (duration) {
				if (duration < 0) return "0:00";

				const hours = Math.floor(duration / (60 * 60));
				const minutes = Math.floor((duration - hours) / 60);
				const seconds = Math.floor(
					duration - hours * 60 * 60 - minutes * 60
				);

				const formatHours = () => {
					if (hours > 0) {
						if (hours < 10) return `0${hours}:`;
						return `${hours}:`;
					}
					return "";
				};

				return `${formatHours()}${minutes}:${
					seconds < 10 ? `0${seconds}` : seconds
				}`;
			}
			return false;
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

			if (!this.paused) {
				const timeElapsed = this.getTimeElapsed();
				const currentPlayerTime = this.player.getCurrentTime() * 1000;

				const difference = timeElapsed - currentPlayerTime;
				// console.log(difference123);
				if (difference < -200) {
					// console.log("Difference0.8");
					this.player.setPlaybackRate(0.8);
				} else if (difference < -50) {
					// console.log("Difference0.9");
					this.player.setPlaybackRate(0.9);
				} else if (difference < -25) {
					// console.log("Difference0.99");
					this.player.setPlaybackRate(0.99);
				} else if (difference > 200) {
					// console.log("Difference1.2");
					this.player.setPlaybackRate(1.2);
				} else if (difference > 50) {
					// console.log("Difference1.1");
					this.player.setPlaybackRate(1.1);
				} else if (difference > 25) {
					// console.log("Difference1.01");
					this.player.setPlaybackRate(1.01);
				} else if (this.player.getPlaybackRate !== 1.0) {
					// console.log("NDifference1.0");
					this.player.setPlaybackRate(1.0);
				}
			}

			/* if (this.currentTime !== undefined && this.paused) {
				this.timePaused += Date.currently() - this.currentTime;
				this.currentTime = undefined;
			} */

			let { timePaused } = this;
			if (this.paused) timePaused += Date.currently() - this.pausedAt;

			const duration =
				(Date.currently() - this.startedAt - timePaused) / 1000;

			const songDuration = this.currentSong.duration;
			if (songDuration <= duration) this.player.pauseVideo();
			if (!this.paused && duration <= songDuration)
				this.timeElapsed = this.formatTime(duration);
		},
		toggleLock() {
			window.socket.emit("stations.toggleLock", this.station._id, res => {
				if (res.status === "success") {
					Toast.methods.addToast(
						"Successfully toggled the queue lock.",
						4000
					);
				} else Toast.methods.addToast(res.message, 8000);
			});
		},
		changeVolume() {
			const volume = document.getElementById("volumeSlider").value;
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
			this.updatePaused(false);
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
		pauseLocalStation() {
			this.updatePaused(true);
			if (!this.noSong) {
				this.timeBeforePause = this.getTimeElapsed();
				if (this.playerReady) this.player.pauseVideo();
			}
		},
		skipStation() {
			this.socket.emit("stations.forceSkip", this.station._id, data => {
				if (data.status !== "success")
					Toast.methods.addToast(`Error: ${data.message}`, 8000);
				else
					Toast.methods.addToast(
						"Successfully skipped the station's current song.",
						4000
					);
			});
		},
		voteSkipStation() {
			this.socket.emit("stations.voteSkip", this.station._id, data => {
				if (data.status !== "success")
					Toast.methods.addToast(`Error: ${data.message}`, 8000);
				else
					Toast.methods.addToast(
						"Successfully voted to skip the current song.",
						4000
					);
			});
		},
		resumeStation() {
			this.socket.emit("stations.resume", this.station._id, data => {
				if (data.status !== "success")
					Toast.methods.addToast(`Error: ${data.message}`, 8000);
				else
					Toast.methods.addToast(
						"Successfully resumed the station.",
						4000
					);
			});
		},
		pauseStation() {
			this.socket.emit("stations.pause", this.station._id, data => {
				if (data.status !== "success")
					Toast.methods.addToast(`Error: ${data.message}`, 8000);
				else
					Toast.methods.addToast(
						"Successfully paused the station.",
						4000
					);
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
				document.getElementById("volumeSlider").value = volume * 100;
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
				document.getElementById("volumeSlider").value = volume * 100;
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
							Toast.methods.addToast(
								`Error: ${data.message}`,
								8000
							);
					}
				);
			else
				this.socket.emit(
					"songs.like",
					this.currentSong.songId,
					data => {
						if (data.status !== "success")
							Toast.methods.addToast(
								`Error: ${data.message}`,
								8000
							);
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
							Toast.methods.addToast(
								`Error: ${data.message}`,
								8000
							);
					}
				);

			return this.socket.emit(
				"songs.dislike",
				this.currentSong.songId,
				data => {
					if (data.status !== "success")
						Toast.methods.addToast(`Error: ${data.message}`, 8000);
				}
			);
		},
		addFirstPrivatePlaylistSongToQueue() {
			let isInQueue = false;
			if (this.station.type === "community") {
				this.songsList.forEach(queueSong => {
					if (queueSong.requestedBy === this.userId) isInQueue = true;
				});
				if (!isInQueue && this.privatePlaylistQueueSelected) {
					this.socket.emit(
						"playlists.getFirstSong",
						this.privatePlaylistQueueSelected,
						data => {
							if (data.status === "success") {
								if (data.song.duration < 15 * 60) {
									this.automaticallyRequestedSongId =
										data.song.songId;
									this.socket.emit(
										"stations.addToQueue",
										this.station._id,
										data.song.songId,
										data2 => {
											if (data2.status === "success") {
												this.socket.emit(
													"playlists.moveSongToBottom",
													this
														.privatePlaylistQueueSelected,
													data.song.songId,
													data3 => {
														if (
															data3.status ===
															"success"
														) {} // eslint-disable-line
													}
												);
											}
										}
									);
								} else {
									Toast.methods.addToast(
										`Top song in playlist was too long to be added.`,
										3000
									);
									this.socket.emit(
										"playlists.moveSongToBottom",
										this.privatePlaylistQueueSelected,
										data.song.songId,
										data3 => {
											if (data3.status === "success") {
												setTimeout(() => {
													this.addFirstPrivatePlaylistSongToQueue();
												}, 3000);
											}
										}
									);
								}
							}
						}
					);
				}
			}
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
						type
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
						type
					});
					const currentSong = res.data.currentSong
						? res.data.currentSong
						: {};
					if (currentSong.artists)
						currentSong.artists = currentSong.artists.join(", ");
					this.updateCurrentSong(currentSong);
					this.startedAt = res.data.startedAt;
					this.updatePaused(res.data.paused);
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
				}
			});
		},
		...mapActions("modals", ["openModal"]),
		...mapActions("station", [
			"joinStation",
			"updateUserCount",
			"updateUsers",
			"updateCurrentSong",
			"updatePreviousSong",
			"updateSongsList",
			"updatePaused",
			"updateNoSong"
		])
	},
	mounted() {
		Date.currently = () => {
			return new Date().getTime() + this.systemDifference;
		};

		this.stationName = this.$route.params.id;

		window.stationInterval = 0;

		io.getSocket(socket => {
			this.socket = socket;

			io.removeAllListeners();
			if (this.socket.connected) this.join();
			io.onConnect(this.join);
			this.socket.emit("stations.findByName", this.stationName, res => {
				if (res.status === "failure") {
					this.loading = false;
					this.exists = false;
				} else {
					this.exists = true;
				}
			});
			this.socket.on("event:songs.next", data => {
				const previousSong = this.currentSong.songId
					? this.currentSong
					: null;
				this.updatePreviousSong(previousSong);
				this.updateCurrentSong(
					data.currentSong ? data.currentSong : {}
				);
				this.startedAt = data.startedAt;
				this.updatePaused(data.paused);
				this.timePaused = data.timePaused;
				if (data.currentSong) {
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
				this.pauseLocalStation();
			});

			this.socket.on("event:stations.resume", data => {
				this.timePaused = data.timePaused;
				this.resumeLocalStation();
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
		});

		if (JSON.parse(localStorage.getItem("muted"))) {
			this.muted = true;
			this.player.setVolume(0);
			document.getElementById("volumeSlider").value = 0 * 100;
		} else {
			let volume = parseFloat(localStorage.getItem("volume"));
			volume =
				typeof volume === "number" && !Number.isNaN(volume)
					? volume
					: 20;
			localStorage.setItem("volume", volume);
			document.getElementById("volumeSlider").value = volume * 100;
		}
	},
	components: {
		StationHeader,
		SongQueue: () => import("../Modals/AddSongToQueue.vue"),
		AddToPlaylist: () => import("../Modals/AddSongToPlaylist.vue"),
		EditPlaylist: () => import("../Modals/Playlists/Edit.vue"),
		CreatePlaylist: () => import("../Modals/Playlists/Create.vue"),
		EditStation: () => import("../Modals/EditStation.vue"),
		Report: () => import("../Modals/Report.vue"),
		SongsListSidebar: () => import("../Sidebars/SongsList.vue"),
		PlaylistSidebar: () => import("../Sidebars/Playlist.vue"),
		UsersSidebar: () => import("../Sidebars/UsersList.vue"),
		UserIdToUsername,
		Z404
	}
};
</script>

<style lang="scss">
@import "styles/global.scss";

.player-can-not-autoplay {
	position: absolute;
	width: 100%;
	height: 100%;
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

.slide-enter-active,
.slide-leave-active {
	transition: all 0.3s ease;
}
.slide-enter,
.slide-leave-to {
	transform: translateX(300px);
}

.no-song {
	color: $primary-color;
	text-align: center;
}

#volumeSlider {
	padding: 0 15px;
	background: transparent;
}

.volume-slider-wrapper {
	margin-top: 0;
	position: relative;
	display: flex;
	align-items: center;
	.material-icons {
		user-select: none;
	}
}

.material-icons {
	cursor: pointer;
}

.stationDisplayName {
	color: $white !important;
}

.add-to-playlist {
	display: flex;
	align-items: center;
	justify-content: center;
}

.slideout {
	top: 50px;
	height: 100%;
	position: fixed;
	right: 0;
	width: 350px;
	background-color: $white;
	box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16),
		0 2px 10px 0 rgba(0, 0, 0, 0.12);
	.slideout-header {
		text-align: center;
		background-color: rgb(3, 169, 244) !important;
		margin: 0;
		padding-top: 5px;
		padding-bottom: 7px;
		color: $white;
	}

	.slideout-content {
		height: 100%;
	}
}

.modal-large {
	width: 75%;
}

.station {
	flex: 1 0 auto;
	padding-top: 0.5vw;
	transition: all 0.1s;
	margin: 0 auto;
	max-width: 100%;
	width: 90%;

	@media only screen and (min-width: 993px) {
		width: 70%;
	}

	@media only screen and (min-width: 601px) {
		width: 85%;
	}

	@media (min-width: 999px) {
		.mobile-only {
			display: none;
		}
		.desktop-only {
			display: block;
		}
	}
	@media (max-width: 998px) {
		.mobile-only {
			display: block;
		}
		.desktop-only {
			display: none;
			visibility: hidden;
		}
	}

	.mobile-only {
		text-align: center;
	}

	.playlistCard {
		margin: 10px;
		position: relative;
		padding-bottom: calc(31.25% + 7px);
		height: 0;
		overflow-y: scroll;

		.title {
			background-color: rgb(3, 169, 244);
			text-align: center;
			padding: 10px;
			color: $white;
			font-weight: 600;
		}

		.media {
			padding: 0 25px;
		}

		.media-content .content {
			min-height: 64px;
			max-height: 64px;
			display: flex;
			align-items: center;
		}

		.content p strong {
			word-break: break-word;
		}

		.content p small {
			word-break: break-word;
		}

		.add-to-queue {
			width: 100%;
			margin-top: 25px;
			height: 40px;
			border-radius: 0;
			background: rgb(3, 169, 244);
			color: $white !important;
			border: 0;
			&:active,
			&:focus {
				border: 0;
			}
		}

		.add-to-queue:focus {
			background: $primary-color;
		}

		.media-right {
			line-height: 64px;
		}

		.songTitle {
			word-wrap: break-word;
			overflow: hidden;
			text-overflow: ellipsis;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
			line-height: 20px;
			max-height: 40px;
			width: 100%;
		}
	}

	input[type="range"] {
		-webkit-appearance: none;
		width: 100%;
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

	.video-container {
		position: relative;
		padding-bottom: 56.25%;
		height: 0;
		overflow: hidden;

		iframe {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
		}
	}
	.video-col {
		padding-right: 0.75rem;
		padding-left: 0.75rem;
	}
}

.room-title {
	left: 50%;
	-webkit-transform: translateX(-50%);
	transform: translateX(-50%);
	font-size: 2.1em;
}

#ratings {
	span {
		font-size: 1.68rem;
	}

	i {
		color: #9e9e9e !important;
		cursor: pointer;
		transition: 0.1s color;
	}
}

#time-display {
	margin-top: 30px;
	float: right;
}

#thumbs_up:hover,
#thumbs_up.liked {
	color: $green !important;
}

#thumbs_down:hover,
#thumbs_down.disliked {
	color: $red !important;
}

#song-thumbnail {
	max-width: 100%;
	width: 85%;
}

.seeker-bar-container {
	position: relative;
	height: 7px;
	display: block;
	width: 100%;
	overflow: hidden;
}

.seeker-bar {
	top: 0;
	left: 0;
	bottom: 0;
	position: absolute;
}

ul {
	list-style: none;
	margin: 0;
	display: block;
}

h1,
h2,
h3,
h4,
h5,
h6 {
	font-weight: 400;
	line-height: 1.1;
}

h1 a,
h2 a,
h3 a,
h4 a,
h5 a,
h6 a {
	font-weight: inherit;
}

h1 {
	font-size: 4.2rem;
	line-height: 110%;
	margin: 2.1rem 0 1.68rem 0;
}

h2 {
	font-size: 3.56rem;
	line-height: 110%;
	margin: 1.78rem 0 1.424rem 0;
}

h3 {
	font-size: 2.92rem;
	line-height: 110%;
	margin: 1.46rem 0 1.168rem 0;
}

h4 {
	font-size: 2.28rem;
	line-height: 110%;
	margin: 1.14rem 0 0.912rem 0;
}

h5 {
	font-size: 1.64rem;
	line-height: 110%;
	margin: 0.82rem 0 0.656rem 0;
}

h6 {
	font-size: 1rem;
	line-height: 110%;
	margin: 0.5rem 0 0.4rem 0;
}

.thin {
	font-weight: 200;
}

.left {
	float: left !important;
}

.right {
	float: right !important;
}

.light-blue {
	background-color: $primary-color !important;
}

.white {
	background-color: $white !important;
}

.btn-search {
	font-size: 14px;
}

.menu {
	padding: 0 10px;
}

.menu-list li a:hover {
	color: #000 !important;
}

.menu-list li {
	display: flex;
	justify-content: space-between;
}

.menu-list a {
	/*padding: 0 10px !important;*/
}

.menu-list a:hover {
	background-color: transparent;
}

.icons-group {
	display: flex;
}

#like,
#dislike {
	position: relative;
}

.behind {
	z-index: -1;
}

.behind:focus {
	z-index: 0;
}

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
</style>
