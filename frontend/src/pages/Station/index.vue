<template>
	<div>
		<page-metadata
			v-if="exists && !loading"
			:title="`${station.displayName}`"
		/>
		<page-metadata v-else-if="!exists && !loading" :title="`Not found`" />

		<div id="page-loader-container" v-if="loading">
			<content-loader
				width="1920"
				height="1080"
				:primary-color="nightmode ? '#222' : '#fff'"
				:secondary-color="nightmode ? '#444' : '#ddd'"
				preserve-aspect-ratio="none"
				id="page-loader-content"
			>
				<rect x="55" y="105" rx="5" ry="5" width="670" height="149" />
				<rect x="55" y="283" rx="5" ry="5" width="670" height="640" />
				<rect x="745" y="108" rx="5" ry="5" width="1120" height="672" />
				<rect x="745" y="810" rx="5" ry="5" width="1120" height="110" />
			</content-loader>

			<content-loader
				width="1920"
				height="1080"
				:primary-color="nightmode ? '#222' : '#fff'"
				:secondary-color="nightmode ? '#444' : '#ddd'"
				preserve-aspect-ratio="none"
				id="page-loader-layout"
			>
				<rect x="0" y="0" rx="0" ry="0" width="1920" height="64" />
				<rect x="0" y="980" rx="0" ry="0" width="1920" height="100" />
			</content-loader>
		</div>

		<!-- More simplistic loading animation for mobile users -->
		<div v-show="loading" id="mobile-progress-animation" />

		<ul
			v-if="
				currentSong &&
				(currentSong.youtubeId === 'l9PxOanFjxQ' ||
					currentSong.youtubeId === 'xKVcVSYmesU' ||
					currentSong.youtubeId === '60ItHLz5WEA' ||
					currentSong.youtubeId === 'e6vkFbtSGm0')
			"
			class="bg-bubbles"
		>
			<li></li>
			<li></li>
			<li></li>
			<li></li>
			<li></li>
			<li></li>
			<li></li>
			<li></li>
			<li></li>
			<li></li>
		</ul>

		<div v-show="!loading && exists">
			<main-header />

			<div id="station-outer-container">
				<div
					id="station-inner-container"
					:class="{ 'nothing-here': noSong }"
				>
					<div id="station-left-column" class="column">
						<div id="about-station-container" class="quadrant">
							<div id="station-info">
								<div class="row" id="station-name">
									<h1>{{ station.displayName }}</h1>
									<i
										v-if="station.type === 'official'"
										class="material-icons verified-station"
										content="Verified Station"
										v-tippy
									>
										check_circle
									</i>
									<a>
										<!-- Favorite Station Button -->
										<i
											v-if="
												loggedIn && station.isFavorited
											"
											@click.prevent="unfavoriteStation()"
											content="Unfavorite Station"
											v-tippy
											class="material-icons"
											>star</i
										>
										<i
											v-if="
												loggedIn && !station.isFavorited
											"
											@click.prevent="favoriteStation()"
											class="material-icons"
											content="Favorite Station"
											v-tippy
											>star_border</i
										>
									</a>
									<i
										class="material-icons stationMode"
										:content="
											station.partyMode
												? 'Station in Party mode'
												: 'Station in Playlist mode'
										"
										v-tippy="{ theme: 'info' }"
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

								<!-- (Admin) Station Settings Button -->
								<button
									class="button is-primary"
									@click="openModal('manageStation')"
								>
									<i class="material-icons icon-with-button"
										>settings</i
									>
									<span> Manage Station </span>
								</button>
							</div>
						</div>
						<div id="sidebar-container" class="quadrant">
							<station-sidebar />
						</div>
					</div>
					<div id="station-right-column" class="column">
						<div class="player-container quadrant" v-show="!noSong">
							<div id="video-container">
								<div
									id="stationPlayer"
									style="
										width: 100%;
										height: 100%;
										min-height: 200px;
									"
								/>
								<div
									class="player-cannot-autoplay"
									v-if="!canAutoplay"
									@click="
										increaseVolume() && decreaseVolume()
									"
								>
									<p>
										Please click anywhere on the screen for
										the video to start
									</p>
								</div>
							</div>
							<div id="seeker-bar-container">
								<div
									id="seeker-bar"
									:style="{
										width: `${seekerbarPercentage}%`
									}"
									:class="{
										nyan:
											currentSong &&
											currentSong.youtubeId ===
												'QH2-TGUlwu4'
									}"
								/>
								<img
									v-if="
										currentSong &&
										currentSong.youtubeId === 'QH2-TGUlwu4'
									"
									src="https://freepngimg.com/thumb/nyan_cat/1-2-nyan-cat-free-download-png.png"
									:style="{
										position: 'absolute',
										top: `-10px`,
										left: `${seekerbarPercentage}%`,
										width: '50px'
									}"
								/>
								<img
									v-if="
										currentSong &&
										(currentSong.youtubeId ===
											'DtVBCG6ThDk' ||
											currentSong.youtubeId ===
												'sI66hcu9fIs' ||
											currentSong.youtubeId ===
												'iYYRH4apXDo' ||
											currentSong.youtubeId ===
												'tRcPA7Fzebw')
									"
									src="/assets/rocket.svg"
									:style="{
										position: 'absolute',
										top: `-21px`,
										left: `calc(${seekerbarPercentage}% - 35px)`,
										width: '50px',
										transform: 'rotate(45deg)'
									}"
								/>
								<img
									v-if="
										currentSong &&
										currentSong.youtubeId === 'jofNR_WkoCE'
									"
									src="/assets/fox.svg"
									:style="{
										position: 'absolute',
										top: `-21px`,
										left: `calc(${seekerbarPercentage}% - 35px)`,
										width: '50px',
										transform: 'scaleX(-1)',
										opacity: 1
									}"
								/>
								<img
									v-if="
										currentSong &&
										(currentSong.youtubeId ===
											'l9PxOanFjxQ' ||
											currentSong.youtubeId ===
												'xKVcVSYmesU' ||
											currentSong.youtubeId ===
												'60ItHLz5WEA' ||
											currentSong.youtubeId ===
												'e6vkFbtSGm0')
									"
									src="/assets/old_logo.png"
									:style="{
										position: 'absolute',
										top: `-9px`,
										left: `calc(${seekerbarPercentage}% - 22px)`,
										'background-color': 'rgb(96, 199, 169)',
										width: '25px',
										height: '25px',
										'border-radius': '25px'
									}"
								/>
							</div>
							<div id="control-bar-container">
								<div id="left-buttons">
									<!-- Debug Box -->
									<button
										v-if="frontendDevMode === 'development'"
										class="button is-primary"
										@click="togglePlayerDebugBox()"
										@dblclick="resetPlayerDebugBox()"
										content="Debug"
										v-tippy
									>
										<i
											class="
												material-icons
												icon-with-button
											"
										>
											bug_report
										</i>
									</button>

									<!-- Local Pause/Resume Button -->
									<button
										class="button is-primary"
										@click="resumeLocalStation()"
										id="local-resume"
										v-if="localPaused"
										content="Unpause Playback"
										v-tippy
									>
										<i class="material-icons">play_arrow</i>
									</button>
									<button
										class="button is-primary"
										@click="pauseLocalStation()"
										id="local-pause"
										v-else
										content="Pause Playback"
										v-tippy
									>
										<i class="material-icons">pause</i>
									</button>

									<!-- Vote to Skip Button -->
									<button
										v-if="!skipVotesLoaded"
										class="button is-primary disabled"
										content="Skip votes have not been loaded yet"
										v-tippy
									>
										<i
											class="
												material-icons
												icon-with-button
											"
											>skip_next</i
										>
									</button>
									<button
										v-else-if="loggedIn"
										class="button is-primary"
										@click="voteSkipStation()"
										content="Vote to Skip Song"
										v-tippy
									>
										<i
											class="
												material-icons
												icon-with-button
											"
											>skip_next</i
										>
										{{ currentSong.skipVotes }}
									</button>
									<button
										v-else
										class="button is-primary disabled"
										content="Log in to vote to skip songs"
										v-tippy="{ theme: 'info' }"
									>
										<i
											class="
												material-icons
												icon-with-button
											"
											>skip_next</i
										>
										{{ currentSong.skipVotes }}
									</button>
								</div>
								<div id="duration">
									<p>
										{{ timeElapsed }} /
										{{
											utils.formatTime(
												currentSong.duration
											)
										}}
									</p>
								</div>
								<p id="volume-control" v-if="!isApple">
									<i
										v-if="muted"
										class="material-icons"
										@click="toggleMute()"
										content="Unmute"
										v-tippy
										>volume_mute</i
									>
									<i
										v-else
										class="material-icons"
										@click="toggleMute()"
										content="Mute"
										v-tippy
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
									<i
										class="material-icons"
										@click="increaseVolume()"
										content="Increase Volume"
										v-tippy
										>volume_up</i
									>
								</p>
								<div id="right-buttons" v-if="loggedIn">
									<!-- Ratings (Like/Dislike) Buttons -->
									<div
										id="ratings"
										v-if="ratingsLoaded && ownRatingsLoaded"
										:class="{
											liked: currentSong.liked,
											disliked: currentSong.disliked
										}"
									>
										<!-- Like Song Button -->
										<button
											class="button is-success like-song"
											id="like-song"
											@click="toggleLike()"
											content="Like Song"
											v-tippy
										>
											<i
												class="
													material-icons
													icon-with-button
												"
												:class="{
													liked: currentSong.liked
												}"
												>thumb_up_alt</i
											>{{ currentSong.likes }}
										</button>

										<!-- Dislike Song Button -->
										<button
											class="
												button
												is-danger
												dislike-song
											"
											id="dislike-song"
											@click="toggleDislike()"
											content="Dislike Song"
											v-tippy
										>
											<i
												class="
													material-icons
													icon-with-button
												"
												:class="{
													disliked:
														currentSong.disliked
												}"
												>thumb_down_alt</i
											>{{ currentSong.dislikes }}
										</button>
									</div>
									<div id="ratings" class="disabled" v-else>
										<!-- Like Song Button -->
										<button
											class="
												button
												is-success
												like-song
												disabled
											"
											id="like-song"
											content="Ratings have not been loaded yet"
											v-tippy
										>
											<i
												class="
													material-icons
													icon-with-button
												"
												>thumb_up_alt</i
											>
										</button>

										<!-- Dislike Song Button -->
										<button
											class="
												button
												is-danger
												dislike-song
												disabled
											"
											id="dislike-song"
											content="Ratings have not been loaded yet"
											v-tippy
										>
											<i
												class="
													material-icons
													icon-with-button
												"
												>thumb_down_alt</i
											>
										</button>
									</div>

									<!-- Add Song To Playlist Button & Dropdown -->
									<add-to-playlist-dropdown
										:song="currentSong"
										placement="top-end"
									>
										<template #button>
											<div
												id="add-song-to-playlist"
												content="Add Song to Playlist"
												v-tippy
											>
												<div class="control has-addons">
													<button
														class="
															button
															is-primary
														"
													>
														<i
															class="
																material-icons
															"
														>
															playlist_add
														</i>
													</button>
													<button
														class="button"
														id="dropdown-toggle"
													>
														<i
															class="
																material-icons
															"
														>
															{{
																showPlaylistDropdown
																	? "expand_more"
																	: "expand_less"
															}}
														</i>
													</button>
												</div>
											</div>
										</template>
									</add-to-playlist-dropdown>
								</div>
								<div id="right-buttons" v-else>
									<!-- Disabled Ratings (Like/Dislike) Buttons -->
									<div id="ratings" v-if="ratingsLoaded">
										<!-- Disabled Like Song Button -->
										<button
											class="button is-success disabled"
											id="like-song"
											content="Log in to like songs"
											v-tippy="{ theme: 'info' }"
										>
											<i
												class="
													material-icons
													icon-with-button
												"
												>thumb_up_alt</i
											>{{ currentSong.likes }}
										</button>

										<!-- Disabled Dislike Song Button -->
										<button
											class="button is-danger disabled"
											id="dislike-song"
											content="Log in to dislike songs"
											v-tippy="{ theme: 'info' }"
										>
											<i
												class="
													material-icons
													icon-with-button
												"
												>thumb_down_alt</i
											>{{ currentSong.dislikes }}
										</button>
									</div>
									<div id="ratings" v-else>
										<!-- Disabled Like Song Button -->
										<button
											class="button is-success disabled"
											id="like-song"
											content="Ratings have not been loaded yet"
											v-tippy="{ theme: 'info' }"
										>
											<i
												class="
													material-icons
													icon-with-button
												"
												>thumb_up_alt</i
											>
										</button>

										<!-- Disabled Dislike Song Button -->
										<button
											class="button is-danger disabled"
											id="dislike-song"
											content="Ratings have not been loaded yet"
											v-tippy="{ theme: 'info' }"
										>
											<i
												class="
													material-icons
													icon-with-button
												"
												>thumb_down_alt</i
											>
										</button>
									</div>
									<!-- Disabled Add Song To Playlist Button & Dropdown -->
									<div id="add-song-to-playlist">
										<div class="control has-addons">
											<button
												class="
													button
													is-primary
													disabled
												"
												content="Log in to add songs to playlist"
												v-tippy="{ theme: 'info' }"
											>
												<i class="material-icons"
													>queue</i
												>
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>
						<p
							class="player-container nothing-here-text"
							v-if="noSong"
						>
							No song is currently playing
						</p>
						<div v-if="!noSong" id="current-next-row">
							<div
								id="currently-playing-container"
								class="quadrant"
								:class="{ 'no-currently-playing': noSong }"
							>
								<song-item
									:song="currentSong"
									:duration="false"
									:requested-by="
										station.type === 'community' &&
										station.partyMode === true
									"
									header="Currently Playing.."
								/>
							</div>
							<div
								v-if="nextSong"
								id="next-up-container"
								class="quadrant"
							>
								<song-item
									:song="nextSong"
									:duration="false"
									:requested-by="
										station.type === 'community' &&
										station.partyMode === true
									"
									header="Next Up.."
								/>
							</div>
						</div>
					</div>
				</div>

				<request-song v-if="modals.requestSong" />
				<edit-playlist v-if="modals.editPlaylist" />
				<create-playlist v-if="modals.createPlaylist" />
				<manage-station
					v-if="modals.manageStation"
					:station-id="station._id"
					sector="station"
				/>
				<edit-song
					v-if="modals.editSong"
					song-type="songs"
					sector="station"
				/>
				<report v-if="modals.report" />
			</div>

			<main-footer />
		</div>

		<floating-box id="player-debug-box" ref="playerDebugBox">
			<template #body>
				<span><b>No song</b>: {{ noSong }}</span>
				<span><b>Song id</b>: {{ currentSong._id }}</span>
				<span><b>YouTube id</b>: {{ currentSong.youtubeId }}</span>
				<span><b>Duration</b>: {{ currentSong.duration }}</span>
				<span
					><b>Skip duration</b>: {{ currentSong.skipDuration }}</span
				>
				<span><b>Loading</b>: {{ loading }}</span>
				<span><b>Can autoplay</b>: {{ canAutoplay }}</span>
				<span><b>Player ready</b>: {{ playerReady }}</span>
				<span
					><b>Attempts to play video</b>:
					{{ attemptsToPlayVideo }}</span
				>
				<span
					><b>Last time requested if can autoplay</b>:
					{{ lastTimeRequestedIfCanAutoplay }}</span
				>
				<span><b>Seeking</b>: {{ seeking }}</span>
				<span><b>Playback rate</b>: {{ playbackRate }}</span>
				<span><b>System difference</b>: {{ systemDifference }}</span>
				<span><b>Time before paused</b>: {{ timeBeforePause }}</span>
				<span><b>Time paused</b>: {{ timePaused }}</span>
				<span><b>Time elapsed</b>: {{ timeElapsed }}</span>
				<span><b>Volume slider value</b>: {{ volumeSliderValue }}</span>
				<span><b>Local paused</b>: {{ localPaused }}</span>
				<span><b>Station paused</b>: {{ stationPaused }}</span>
				<span
					><b>Party playlists selected</b>: {{ partyPlaylists }}</span
				>
				<span><b>Skip votes loaded</b>: {{ skipVotesLoaded }}</span>
				<span
					><b>Skip votes current</b>:
					{{
						currentSong.skipVotesCurrent === true ||
						currentSong.skipVotesCurrent === false
							? currentSong.skipVotesCurrent
							: "N/A"
					}}</span
				>
				<span
					><b>Skip votes</b>:
					{{ skipVotesLoaded ? currentSong.skipVotes : "N/A" }}</span
				>
				<span><b>Ratings loaded</b>: {{ ratingsLoaded }}</span>
				<span
					><b>Ratings</b>:
					{{
						ratingsLoaded
							? `${currentSong.likes} / ${currentSong.dislikes}`
							: "N/A"
					}}</span
				>
				<span><b>Own ratings loaded</b>: {{ ownRatingsLoaded }}</span>
				<span
					><b>Own ratings</b>:
					{{
						ownRatingsLoaded
							? `${currentSong.liked} / ${currentSong.disliked}`
							: "N/A"
					}}</span
				>
			</template>
		</floating-box>
		<floating-box
			id="keyboardShortcutsHelper"
			ref="keyboardShortcutsHelper"
		>
			<template #body>
				<div>
					<div v-if="isOwnerOrAdmin()">
						<span class="biggest"><b>Admin/owner</b></span>
						<span><b>Ctrl + Space</b> - Pause/resume station</span>
						<span><b>Ctrl + Numpad right</b> - Skip station</span>
					</div>
					<hr v-if="isOwnerOrAdmin()" />
					<div>
						<span class="biggest"><b>Volume</b></span>
						<span
							><b>Ctrl + Numpad up/down</b> - Volume up/down
							10%</span
						>
						<span
							><b>Ctrl + Shift + Numpad up/down</b> - Volume
							up/down 10%</span
						>
					</div>
					<hr />
					<div>
						<span class="biggest"><b>Misc</b></span>
						<span><b>Ctrl + D</b> - Toggles debug box</span>
						<span><b>Ctrl + Shift + D</b> - Resets debug box</span>
						<span
							><b>Ctrl + /</b> - Toggles keyboard shortcuts
							box</span
						>
						<span
							><b>Ctrl + Shift + /</b> - Resets keyboard shortcuts
							box</span
						>
					</div>
				</div>
			</template>
		</floating-box>

		<Z404 v-if="!exists"></Z404>
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import { defineAsyncComponent } from "vue";
import Toast from "toasters";
import { ContentLoader } from "vue-content-loader";

import aw from "@/aw";
import ws from "@/ws";
import keyboardShortcuts from "@/keyboardShortcuts";

import MainHeader from "@/components/layout/MainHeader.vue";
import MainFooter from "@/components/layout/MainFooter.vue";

import FloatingBox from "@/components/FloatingBox.vue";
import AddToPlaylistDropdown from "@/components/AddToPlaylistDropdown.vue";
import SongItem from "@/components/SongItem.vue";
import Z404 from "../404.vue";

import utils from "../../../js/utils";

import StationSidebar from "./Sidebar/index.vue";

export default {
	components: {
		ContentLoader,
		MainHeader,
		MainFooter,
		RequestSong: defineAsyncComponent(() =>
			import("@/components/modals/RequestSong.vue")
		),
		EditPlaylist: defineAsyncComponent(() =>
			import("@/components/modals/EditPlaylist")
		),
		CreatePlaylist: defineAsyncComponent(() =>
			import("@/components/modals/CreatePlaylist.vue")
		),
		ManageStation: defineAsyncComponent(() =>
			import("@/components/modals/ManageStation/index.vue")
		),
		Report: defineAsyncComponent(() =>
			import("@/components/modals/Report.vue")
		),
		Z404,
		FloatingBox,
		StationSidebar,
		AddToPlaylistDropdown,
		EditSong: defineAsyncComponent(() =>
			import("@/components/modals/EditSong")
		),
		SongItem
	},
	data() {
		return {
			utils,
			isApple:
				navigator.platform.match(/iPhone|iPod|iPad/) ||
				navigator.vendor === "Apple Computer, Inc.",
			title: "Station",
			loading: true,
			exists: true,
			playerReady: false,
			player: undefined,
			timePaused: 0,
			muted: false,
			timeElapsed: "0:00",
			timeBeforePause: 0,
			systemDifference: 0,
			attemptsToPlayVideo: 0,
			canAutoplay: true,
			lastTimeRequestedIfCanAutoplay: 0,
			seeking: false,
			playbackRate: 1,
			volumeSliderValue: 0,
			showPlaylistDropdown: false,
			theme: "var(--primary-color)",
			seekerbarPercentage: 0,
			frontendDevMode: "production",
			activityWatchVideoDataInterval: null,
			activityWatchVideoLastStatus: "",
			activityWatchVideoLastYouTubeId: "",
			activityWatchVideoLastStartDuration: "",
			nextCurrentSong: null,
			editSongModalWatcher: null,
			beforeEditSongModalLocalPaused: null,
			socketConnected: null,
			persistentToastCheckerInterval: null,
			persistentToasts: [],
			partyPlaylistLock: false
		};
	},
	computed: {
		skipVotesLoaded() {
			return (
				!this.noSong &&
				Number.isInteger(this.currentSong.skipVotes) &&
				this.currentSong.skipVotes >= 0
			);
		},
		ratingsLoaded() {
			return (
				!this.noSong &&
				Number.isInteger(this.currentSong.likes) &&
				Number.isInteger(this.currentSong.dislikes) &&
				this.currentSong.likes >= 0 &&
				this.currentSong.dislikes >= 0
			);
		},
		ownRatingsLoaded() {
			return (
				!this.noSong &&
				typeof this.currentSong.liked === "boolean" &&
				typeof this.currentSong.disliked === "boolean"
			);
		},
		aModalIsOpen() {
			return Object.keys(this.currentlyActive).length > 0;
		},
		currentUserQueueSongs() {
			return this.songsList.filter(
				queueSong => queueSong.requestedBy === this.userId
			).length;
		},
		...mapState("modalVisibility", {
			modals: state => state.modals,
			currentlyActive: state => state.currentlyActive
		}),
		...mapState("modals/editSong", {
			video: state => state.video
		}),
		...mapState("station", {
			station: state => state.station,
			currentSong: state => state.currentSong,
			nextSong: state => state.nextSong,
			songsList: state => state.songsList,
			stationPaused: state => state.stationPaused,
			localPaused: state => state.localPaused,
			noSong: state => state.noSong,
			partyPlaylists: state => state.partyPlaylists,
			includedPlaylists: state => state.includedPlaylists,
			excludedPlaylists: state => state.excludedPlaylists
		}),
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			userId: state => state.user.auth.userId,
			role: state => state.user.auth.role,
			nightmode: state => state.user.preferences.nightmode,
			autoSkipDisliked: state => state.user.preferences.autoSkipDisliked
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	async mounted() {
		this.editSongModalWatcher = this.$store.watch(
			state => state.modals.editSong.video.paused,
			paused => {
				if (paused && !this.beforeEditSongModalLocalPaused) {
					this.resumeLocalStation();
				} else if (!paused) {
					this.beforeEditSongModalLocalPaused = this.localPaused;
					this.pauseLocalStation();
				}
			}
		);

		window.scrollTo(0, 0);

		Date.currently = () => new Date().getTime() + this.systemDifference;

		this.stationIdentifier = this.$route.params.id;

		window.stationInterval = 0;
		this.activityWatchVideoDataInterval = setInterval(() => {
			this.sendActivityWatchVideoData();
		}, 1000);
		this.persistentToastCheckerInterval = setInterval(() => {
			this.persistentToasts.filter(
				persistentToast => !persistentToast.checkIfCanRemove()
			);
		}, 1000);

		if (this.socket.readyState === 1) this.join();
		ws.onConnect(() => {
			this.socketConnected = true;
			clearTimeout(window.stationNextSongTimeout);
			this.join();
		});

		ws.onDisconnect(true, () => {
			this.socketConnected = false;
			const { currentSong } = this.currentSong;
			if (this.nextSong)
				this.setNextCurrentSong(
					{
						currentSong: this.nextSong,
						startedAt: Date.now() + this.getTimeRemaining(),
						paused: false,
						timePaused: 0
					},
					true
				);
			else
				this.setNextCurrentSong(
					{
						currentSong: null,
						startedAt: 0,
						paused: false,
						timePaused: 0,
						pausedAt: 0
					},
					true
				);
			window.stationNextSongTimeout = setTimeout(() => {
				if (!this.noSong && this.currentSong._id === currentSong._id)
					this.skipSong("window.stationNextSongTimeout 2");
			}, this.getTimeRemaining());
		});

		this.frontendDevMode = await lofig.get("mode");

		this.socket.dispatch(
			"stations.existsByName",
			this.stationIdentifier,
			res => {
				if (res.status === "error" || !res.data.exists) {
					// station identifier may be using stationid instead
					this.socket.dispatch(
						"stations.existsById",
						this.stationIdentifier,
						res => {
							if (res.status === "error" || !res.data.exists) {
								this.loading = false;
								this.exists = false;
							}
						}
					);
				}
			}
		);

		this.socket.on("event:station.nextSong", res => {
			const { currentSong, startedAt, paused, timePaused } = res.data;

			this.setCurrentSong({
				currentSong,
				startedAt,
				paused,
				timePaused,
				pausedAt: 0
			});
		});

		this.socket.on("event:station.pause", res => {
			this.pausedAt = res.data.pausedAt;
			this.updateStationPaused(true);
			this.pauseLocalPlayer();

			clearTimeout(window.stationNextSongTimeout);
		});

		this.socket.on("event:station.resume", res => {
			this.timePaused = res.data.timePaused;
			this.updateStationPaused(false);
			if (!this.localPaused) this.resumeLocalPlayer();
		});

		this.socket.on("event:station.deleted", () => {
			window.location.href = "/?msg=The station you were in was deleted.";
			return true;
		});

		this.socket.on("event:song.liked", res => {
			if (!this.noSong) {
				if (res.data.youtubeId === this.currentSong.youtubeId) {
					this.updateCurrentSongRatings(res.data);
				}
			}
		});

		this.socket.on("event:song.disliked", res => {
			if (!this.noSong) {
				if (res.data.youtubeId === this.currentSong.youtubeId) {
					this.updateCurrentSongRatings(res.data);
				}
			}
		});

		this.socket.on("event:song.unliked", res => {
			if (!this.noSong) {
				if (res.data.youtubeId === this.currentSong.youtubeId) {
					this.updateCurrentSongRatings(res.data);
				}
			}
		});

		this.socket.on("event:song.undisliked", res => {
			if (!this.noSong) {
				if (res.data.youtubeId === this.currentSong.youtubeId) {
					this.updateCurrentSongRatings(res.data);
				}
			}
		});

		this.socket.on("event:song.ratings.updated", res => {
			if (!this.noSong) {
				if (res.data.youtubeId === this.currentSong.youtubeId) {
					this.updateOwnCurrentSongRatings(res.data);
				}
			}
		});

		this.socket.on("event:station.queue.updated", res => {
			this.updateSongsList(res.data.queue);

			let nextSong = null;
			if (this.songsList[0])
				nextSong = this.songsList[0].youtubeId
					? this.songsList[0]
					: null;

			this.updateNextSong(nextSong);

			this.addPartyPlaylistSongToQueue();
		});

		this.socket.on("event:station.queue.song.repositioned", res => {
			this.repositionSongInList(res.data.song);

			let nextSong = null;
			if (this.songsList[0])
				nextSong = this.songsList[0].youtubeId
					? this.songsList[0]
					: null;

			this.updateNextSong(nextSong);
		});

		this.socket.on("event:station.voteSkipSong", () => {
			if (this.currentSong)
				this.updateCurrentSongSkipVotes({
					skipVotes: this.currentSong.skipVotes + 1,
					skipVotesCurrent: null
				});
		});

		this.socket.on("event:privatePlaylist.selected", res => {
			if (this.station.type === "community")
				this.station.privatePlaylist = res.data.playlistId;
		});

		this.socket.on("event:privatePlaylist.deselected", () => {
			if (this.station.type === "community")
				this.station.privatePlaylist = null;
		});

		this.socket.on("event:station.partyMode.updated", res => {
			if (this.station.type === "community")
				this.station.partyMode = res.data.partyMode;
		});

		this.socket.on("event:station.theme.updated", res => {
			const { theme } = res.data;
			this.station.theme = theme;
			document.body.style.cssText = `--primary-color: var(--${theme})`;
		});

		this.socket.on("event:station.name.updated", async res => {
			this.station.name = res.data.name;

			await this.$router.push(
				`${res.data.name}?${Object.keys(this.$route.query)
					.map(
						key =>
							`${encodeURIComponent(key)}=${encodeURIComponent(
								this.$route.query[key]
							)}`
					)
					.join("&")}`
			);

			// eslint-disable-next-line no-restricted-globals
			history.replaceState({ ...history.state, ...{} }, null);
		});

		this.socket.on("event:station.displayName.updated", res => {
			this.station.displayName = res.data.displayName;
		});

		this.socket.on("event:station.description.updated", res => {
			this.station.description = res.data.description;
		});

		this.socket.on("event:station.users.updated", res =>
			this.updateUsers(res.data.users)
		);

		this.socket.on("event:station.userCount.updated", res =>
			this.updateUserCount(res.data.userCount)
		);

		this.socket.on("event:station.queue.lock.toggled", res => {
			this.station.locked = res.data.locked;
		});

		this.socket.on("event:user.station.favorited", res => {
			if (res.data.stationId === this.station._id)
				this.updateIfStationIsFavorited({ isFavorited: true });
		});

		this.socket.on("event:user.station.unfavorited", res => {
			if (res.data.stationId === this.station._id)
				this.updateIfStationIsFavorited({ isFavorited: false });
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
	beforeUnmount() {
		document.body.style.cssText = "";

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

		this.editSongModalWatcher(); // removes the watcher

		clearInterval(this.activityWatchVideoDataInterval);
		clearTimeout(window.stationNextSongTimeout);
		clearTimeout(this.persistentToastCheckerInterval);
		this.persistentToasts.forEach(persistentToast => {
			persistentToast.toast.destroy();
		});

		this.socket.dispatch("stations.leave", this.station._id, () => {});

		this.leaveStation();
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
		removeFromQueue(youtubeId) {
			window.socket.dispatch(
				"stations.removeFromQueue",
				this.station._id,
				youtubeId,
				res => {
					if (res.status === "success") {
						new Toast("Successfully removed song from the queue.");
					} else new Toast(res.message);
				}
			);
		},
		setNextCurrentSong(nextCurrentSong, skipSkipCheck = false) {
			this.nextCurrentSong = nextCurrentSong;
			// If skipSkipCheck is true, it won't try to skip the song
			if (this.getTimeRemaining() <= 0 && !skipSkipCheck) {
				this.skipSong();
			}
		},
		skipSong() {
			if (this.nextCurrentSong && this.nextCurrentSong.currentSong) {
				const songsList = this.songsList.concat([]);
				if (
					songsList.length > 0 &&
					songsList[0].youtubeId ===
						this.nextCurrentSong.currentSong.youtubeId
				) {
					songsList.splice(0, 1);
					this.updateSongsList(songsList);
				}
				this.setCurrentSong(this.nextCurrentSong);
			} else {
				this.setCurrentSong({
					currentSong: null,
					startedAt: 0,
					paused: this.stationPaused,
					timePaused: 0,
					pausedAt: 0
				});
			}
		},
		setCurrentSong(data) {
			const { currentSong, startedAt, paused, timePaused, pausedAt } =
				data;

			if (currentSong) {
				if (!currentSong.skipDuration || currentSong.skipDuration < 0)
					currentSong.skipDuration = 0;
				if (!currentSong.duration || currentSong.duration < 0)
					currentSong.duration = 0;
			}

			this.updateCurrentSong(currentSong || {});

			let nextSong = null;
			if (this.songsList[0])
				nextSong = this.songsList[0].youtubeId
					? this.songsList[0]
					: null;

			this.updateNextSong(nextSong);
			this.setNextCurrentSong(
				{
					currentSong: null,
					startedAt: 0,
					paused,
					timePaused: 0,
					pausedAt: 0
				},
				true
			);

			clearTimeout(window.stationNextSongTimeout);

			this.startedAt = startedAt;
			this.updateStationPaused(paused);
			this.timePaused = timePaused;
			this.pausedAt = pausedAt;

			if (currentSong) {
				this.updateNoSong(false);

				if (!this.playerReady) this.youtubeReady();
				else this.playVideo();

				// If the station is playing and the backend is not connected, set the next song to skip to after this song and set a timer to skip
				if (!this.stationPaused && !this.socketConnected) {
					if (this.nextSong)
						this.setNextCurrentSong(
							{
								currentSong: this.nextSong,
								startedAt: Date.now() + this.getTimeRemaining(),
								paused: false,
								timePaused: 0
							},
							true
						);
					else
						this.setNextCurrentSong(
							{
								currentSong: null,
								startedAt: 0,
								paused: false,
								timePaused: 0,
								pausedAt: 0
							},
							true
						);
					window.stationNextSongTimeout = setTimeout(() => {
						if (
							!this.noSong &&
							this.currentSong._id === currentSong._id
						)
							this.skipSong("window.stationNextSongTimeout 1");
					}, this.getTimeRemaining());
				}

				const currentSongId = this.currentSong._id;

				this.socket.dispatch(
					"stations.getSkipVotes",
					this.station._id,
					currentSongId,
					res => {
						if (res.status === "success") {
							const { skipVotes, skipVotesCurrent } = res.data;
							if (
								!this.noSong &&
								this.currentSong._id === currentSongId
							) {
								this.updateCurrentSongSkipVotes({
									skipVotes,
									skipVotesCurrent
								});
							}
						}
					}
				);

				this.socket.dispatch(
					"songs.getSongRatings",
					currentSong._id,
					res => {
						if (currentSong._id === this.currentSong._id) {
							const { likes, dislikes } = res.data;
							this.updateCurrentSongRatings({ likes, dislikes });
						}
					}
				);

				if (this.loggedIn) {
					this.socket.dispatch(
						"songs.getOwnSongRatings",
						currentSong.youtubeId,
						res => {
							console.log("getOwnSongRatings", res);
							if (
								res.status === "success" &&
								this.currentSong.youtubeId ===
									res.data.youtubeId
							) {
								this.updateOwnCurrentSongRatings(res.data);

								if (
									this.autoSkipDisliked &&
									res.data.disliked === true
								) {
									this.voteSkipStation();
									new Toast(
										"Automatically voted to skip disliked song."
									);
								}
							}
						}
					);
				}
			} else {
				if (this.playerReady) this.player.pauseVideo();
				this.updateNoSong(true);
			}

			this.calculateTimeElapsed();
			this.resizeSeekerbar();
		},
		youtubeReady() {
			if (!this.player) {
				this.player = new window.YT.Player("stationPlayer", {
					height: 270,
					width: 480,
					videoId: this.currentSong.youtubeId,
					host: "https://www.youtube-nocookie.com",
					startSeconds:
						this.getTimeElapsed() / 1000 +
						this.currentSong.skipDuration,
					playerVars: {
						controls: 0,
						iv_load_policy: 3,
						rel: 0,
						showinfo: 0,
						disablekb: 1,
						playsinline: 1
					},
					events: {
						onReady: () => {
							this.playerReady = true;

							let volume = parseInt(
								localStorage.getItem("volume")
							);

							volume = typeof volume === "number" ? volume : 20;

							this.player.setVolume(volume);

							if (volume > 0) this.player.unMute();
							if (this.muted) this.player.mute();

							this.playVideo();

							// on ios, playback will be forcibly paused locally
							if (this.isApple) {
								this.updateLocalPaused(true);
								new Toast(
									"Please click play manually to use Musare on iOS."
								);
							}
						},
						onError: err => {
							console.log("error with youtube video", err);

							if (err.data === 150 && this.loggedIn) {
								new Toast(
									"Automatically voted to skip as this song isn't available for you."
								);

								// automatically vote to skip
								this.voteSkipStation();

								// persistent message while song is playing
								const persistentToast = new Toast({
									content:
										"This song is unavailable for you, but is playing for everyone else.",
									persistent: true
								});

								// save current song id
								const erroredYoutubeId =
									this.currentSong.youtubeId;

								this.persistentToasts.push({
									toast: persistentToast,
									checkIfCanRemove: () => {
										if (
											this.currentSong.youtubeId !==
											erroredYoutubeId
										) {
											persistentToast.destroy();
											return true;
										}
										return false;
									}
								});
							} else {
								new Toast(
									"There has been an error with the YouTube Embed"
								);
							}
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
								this.canAutoplay = true;
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
							)
								this.seeking = false;

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
		getTimeRemaining() {
			if (this.currentSong) {
				return this.currentSong.duration * 1000 - this.getTimeElapsed();
			}
			return 0;
		},
		playVideo() {
			if (this.playerReady) {
				this.videoLoading = true;
				this.player.loadVideoById(
					this.currentSong.youtubeId,
					this.getTimeElapsed() / 1000 + this.currentSong.skipDuration
				);

				if (window.stationInterval !== 0)
					clearInterval(window.stationInterval);
				window.stationInterval = setInterval(() => {
					if (!this.stationPaused) {
						this.resizeSeekerbar();
						this.calculateTimeElapsed();
					}
				}, 150);
			}
		},
		resizeSeekerbar() {
			this.seekerbarPercentage = parseFloat(
				(this.getTimeElapsed() / 1000 / this.currentSong.duration) * 100
			);
		},
		calculateTimeElapsed() {
			if (
				this.playerReady &&
				!this.noSong &&
				this.currentSong &&
				this.player.getPlayerState() === -1
			) {
				if (!this.canAutoplay) {
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

			if (
				!this.stationPaused &&
				!this.localPaused &&
				this.playerReady &&
				!this.isApple
			) {
				const timeElapsed = this.getTimeElapsed();
				const currentPlayerTime =
					Math.max(
						this.player.getCurrentTime() -
							this.currentSong.skipDuration,
						0
					) * 1000;

				const difference = timeElapsed - currentPlayerTime;

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
					playbackRate = 0.8;
				} else if (difference < -50) {
					playbackRate = 0.9;
				} else if (difference < -25) {
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
					playbackRate = 1.2;
				} else if (difference > 50) {
					playbackRate = 1.1;
				} else if (difference > 25) {
					playbackRate = 1.05;
				} else if (this.player.getPlaybackRate !== 1.0) {
					this.player.setPlaybackRate(1.0);
				}

				if (this.playbackRate !== playbackRate) {
					this.player.setPlaybackRate(playbackRate);
					this.playbackRate = playbackRate;
				}
			}

			let { timePaused } = this;
			if (this.stationPaused)
				timePaused += Date.currently() - this.pausedAt;

			const duration =
				(Date.currently() - this.startedAt - timePaused) / 1000;

			const songDuration = this.currentSong.duration;
			if (songDuration <= duration) this.player.pauseVideo();
			if (duration <= songDuration)
				this.timeElapsed = utils.formatTime(duration);
		},
		toggleLock() {
			window.socket.dispatch(
				"stations.toggleLock",
				this.station._id,
				res => {
					if (res.status === "success") {
						new Toast("Successfully toggled the queue lock.");
					} else new Toast(res.message);
				}
			);
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
			this.socket.dispatch(
				"stations.forceSkip",
				this.station._id,
				data => {
					if (data.status !== "success")
						new Toast(`Error: ${data.message}`);
					else
						new Toast(
							"Successfully skipped the station's current song."
						);
				}
			);
		},
		voteSkipStation() {
			this.socket.dispatch(
				"stations.voteSkip",
				this.station._id,
				data => {
					if (data.status !== "success")
						new Toast(`Error: ${data.message}`);
					else
						new Toast(
							"Successfully voted to skip the current song."
						);
				}
			);
		},
		resumeStation() {
			this.socket.dispatch("stations.resume", this.station._id, data => {
				if (data.status !== "success")
					new Toast(`Error: ${data.message}`);
				else new Toast("Successfully resumed the station.");
			});
		},
		pauseStation() {
			this.socket.dispatch("stations.pause", this.station._id, data => {
				if (data.status !== "success")
					new Toast(`Error: ${data.message}`);
				else new Toast("Successfully paused the station.");
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
			if (this.currentSong.liked)
				this.socket.dispatch(
					"songs.unlike",
					this.currentSong.youtubeId,
					res => {
						if (res.status !== "success")
							new Toast(`Error: ${res.message}`);
					}
				);
			else
				this.socket.dispatch(
					"songs.like",
					this.currentSong.youtubeId,
					res => {
						if (res.status !== "success")
							new Toast(`Error: ${res.message}`);
					}
				);
		},
		toggleDislike() {
			if (this.currentSong.disliked)
				return this.socket.dispatch(
					"songs.undislike",
					this.currentSong.youtubeId,
					res => {
						if (res.status !== "success")
							new Toast(`Error: ${res.message}`);
					}
				);

			return this.socket.dispatch(
				"songs.dislike",
				this.currentSong.youtubeId,
				res => {
					if (res.status !== "success")
						new Toast(`Error: ${res.message}`);
				}
			);
		},
		addPartyPlaylistSongToQueue() {
			if (
				!this.partyPlaylistLock &&
				this.station.type === "community" &&
				this.station.partyMode === true &&
				this.songsList.length < 50 &&
				this.currentUserQueueSongs < 3 &&
				this.partyPlaylists.length > 0
			) {
				const selectedPlaylist =
					this.partyPlaylists[
						Math.floor(Math.random() * this.partyPlaylists.length)
					];
				if (selectedPlaylist._id && selectedPlaylist.songs.length > 0) {
					const selectedSong =
						selectedPlaylist.songs[
							Math.floor(
								Math.random() * selectedPlaylist.songs.length
							)
						];
					if (selectedSong.youtubeId) {
						this.partyPlaylistLock = true;
						this.socket.dispatch(
							"stations.addToQueue",
							this.station._id,
							selectedSong.youtubeId,
							data => {
								this.partyPlaylistLock = false;
								if (data.status !== "success")
									this.addPartyPlaylistSongToQueue();
							}
						);
					}
				}
			}
		},
		togglePlayerDebugBox() {
			this.$refs.playerDebugBox.toggleBox();
		},
		resetPlayerDebugBox() {
			this.$refs.playerDebugBox.resetBox();
		},
		toggleKeyboardShortcutsHelper() {
			this.$refs.keyboardShortcutsHelper.toggleBox();
		},
		resetKeyboardShortcutsHelper() {
			this.$refs.keyboardShortcutsHelper.resetBox();
		},
		join() {
			this.socket.dispatch(
				"stations.join",
				this.stationIdentifier,
				res => {
					if (res.status === "success") {
						setTimeout(() => {
							this.loading = false;
						}, 1000); // prevents popping in of youtube embed etc.

						const {
							_id,
							displayName,
							name,
							description,
							privacy,
							locked,
							partyMode,
							owner,
							privatePlaylist,
							includedPlaylists,
							excludedPlaylists,
							type,
							genres,
							blacklistedGenres,
							isFavorited,
							theme
						} = res.data;

						// change url to use station name instead of station id
						if (name !== this.stationIdentifier) {
							// eslint-disable-next-line no-restricted-globals
							this.$router.replace(name);
						}

						this.joinStation({
							_id,
							name,
							displayName,
							description,
							privacy,
							locked,
							partyMode,
							owner,
							privatePlaylist,
							includedPlaylists,
							excludedPlaylists,
							type,
							genres,
							blacklistedGenres,
							isFavorited,
							theme
						});

						document.body.style.cssText = `--primary-color: var(--${res.data.theme})`;

						this.setCurrentSong({
							currentSong: res.data.currentSong,
							startedAt: res.data.startedAt,
							paused: res.data.paused,
							timePaused: res.data.timePaused,
							pausedAt: res.data.pausedAt
						});

						this.updateUserCount(res.data.userCount);
						this.updateUsers(res.data.users);

						this.socket.dispatch(
							"stations.getStationIncludedPlaylistsById",
							this.station._id,
							res => {
								if (res.status === "success") {
									this.setIncludedPlaylists(
										res.data.playlists
									);
								}
							}
						);

						this.socket.dispatch(
							"stations.getStationExcludedPlaylistsById",
							this.station._id,
							res => {
								if (res.status === "success") {
									this.setExcludedPlaylists(
										res.data.playlists
									);
								}
							}
						);

						this.socket.dispatch("stations.getQueue", _id, res => {
							if (res.status === "success") {
								const { queue } = res.data;
								this.updateSongsList(queue);
								const [nextSong] = queue;

								this.updateNextSong(nextSong);
							}
						});

						if (this.isOwnerOrAdmin()) {
							keyboardShortcuts.registerShortcut(
								"station.pauseResume",
								{
									keyCode: 32, // Spacebar
									shift: false,
									ctrl: true,
									preventDefault: true,
									handler: () => {
										if (this.aModalIsOpen) return;
										if (this.stationPaused)
											this.resumeStation();
										else this.pauseStation();
									}
								}
							);

							keyboardShortcuts.registerShortcut(
								"station.skipStation",
								{
									keyCode: 39, // Right arrow key
									shift: false,
									ctrl: true,
									preventDefault: true,
									handler: () => {
										if (this.aModalIsOpen) return;
										this.skipStation();
									}
								}
							);
						}

						keyboardShortcuts.registerShortcut(
							"station.lowerVolumeLarge",
							{
								keyCode: 40, // Down arrow key
								shift: false,
								ctrl: true,
								preventDefault: true,
								handler: () => {
									if (this.aModalIsOpen) return;
									this.volumeSliderValue -= 1000;
									this.changeVolume();
								}
							}
						);

						keyboardShortcuts.registerShortcut(
							"station.lowerVolumeSmall",
							{
								keyCode: 40, // Down arrow key
								shift: true,
								ctrl: true,
								preventDefault: true,
								handler: () => {
									if (this.aModalIsOpen) return;
									this.volumeSliderValue -= 100;
									this.changeVolume();
								}
							}
						);

						keyboardShortcuts.registerShortcut(
							"station.increaseVolumeLarge",
							{
								keyCode: 38, // Up arrow key
								shift: false,
								ctrl: true,
								preventDefault: true,
								handler: () => {
									if (this.aModalIsOpen) return;
									this.volumeSliderValue += 1000;
									this.changeVolume();
								}
							}
						);

						keyboardShortcuts.registerShortcut(
							"station.increaseVolumeSmall",
							{
								keyCode: 38, // Up arrow key
								shift: true,
								ctrl: true,
								preventDefault: true,
								handler: () => {
									if (this.aModalIsOpen) return;
									this.volumeSliderValue += 100;
									this.changeVolume();
								}
							}
						);

						keyboardShortcuts.registerShortcut(
							"station.toggleDebug",
							{
								keyCode: 68, // D key
								shift: false,
								ctrl: true,
								preventDefault: true,
								handler: () => {
									if (this.aModalIsOpen) return;
									this.togglePlayerDebugBox();
								}
							}
						);

						keyboardShortcuts.registerShortcut(
							"station.toggleKeyboardShortcutsHelper",
							{
								keyCode: 191, // '/' key
								ctrl: true,
								preventDefault: true,
								handler: () => {
									if (this.aModalIsOpen) return;
									this.toggleKeyboardShortcutsHelper();
								}
							}
						);

						keyboardShortcuts.registerShortcut(
							"station.resetKeyboardShortcutsHelper",
							{
								keyCode: 191, // '/' key
								ctrl: true,
								shift: true,
								preventDefault: true,
								handler: () => {
									if (this.aModalIsOpen) return;
									this.resetKeyboardShortcutsHelper();
								}
							}
						);

						// UNIX client time before ping
						const beforePing = Date.now();
						this.socket.dispatch("apis.ping", res => {
							if (res.status === "success") {
								// UNIX client time after ping
								const afterPing = Date.now();
								// Average time in MS it took between the server responding and the client receiving
								const connectionLatency =
									(afterPing - beforePing) / 2;
								console.log(
									connectionLatency,
									beforePing - afterPing
								);
								// UNIX server time
								const serverDate = res.data.date;
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
							}
						});
					} else {
						this.loading = false;
						this.exists = false;
					}
				}
			);
		},
		favoriteStation() {
			this.socket.dispatch(
				"stations.favoriteStation",
				this.station._id,
				res => {
					if (res.status === "success") {
						new Toast("Successfully favorited station.");
					} else new Toast(res.message);
				}
			);
		},
		unfavoriteStation() {
			this.socket.dispatch(
				"stations.unfavoriteStation",
				this.station._id,
				res => {
					if (res.status === "success") {
						new Toast("Successfully unfavorited station.");
					} else new Toast(res.message);
				}
			);
		},
		sendActivityWatchVideoData() {
			if (!this.stationPaused && !this.localPaused && !this.noSong) {
				if (this.activityWatchVideoLastStatus !== "playing") {
					this.activityWatchVideoLastStatus = "playing";
					this.activityWatchVideoLastStartDuration =
						this.currentSong.skipDuration + this.getTimeElapsed();
				}

				if (
					this.activityWatchVideoLastYouTubeId !==
					this.currentSong.youtubeId
				) {
					this.activityWatchVideoLastYouTubeId =
						this.currentSong.youtubeId;
					this.activityWatchVideoLastStartDuration =
						this.currentSong.skipDuration + this.getTimeElapsed();
				}

				const videoData = {
					title: this.currentSong ? this.currentSong.title : null,
					artists:
						this.currentSong && this.currentSong.artists
							? this.currentSong.artists.join(", ")
							: null,
					youtubeId: this.currentSong.youtubeId,
					muted: this.muted,
					volume: this.volumeSliderValue / 100,
					startedDuration:
						this.activityWatchVideoLastStartDuration <= 0
							? 0
							: Math.floor(
									this.activityWatchVideoLastStartDuration /
										1000
							  ),
					source: `station#${this.station.name}`,
					hostname: window.location.hostname
				};

				aw.sendVideoData(videoData);
			} else {
				this.activityWatchVideoLastStatus = "not_playing";
			}
		},
		...mapActions("modalVisibility", ["openModal"]),
		...mapActions("station", [
			"joinStation",
			"leaveStation",
			"updateUserCount",
			"updateUsers",
			"updateCurrentSong",
			"updateNextSong",
			"updateSongsList",
			"repositionSongInList",
			"updateStationPaused",
			"updateLocalPaused",
			"updateNoSong",
			"updateIfStationIsFavorited",
			"setIncludedPlaylists",
			"setExcludedPlaylists",
			"updateCurrentSongRatings",
			"updateOwnCurrentSongRatings",
			"updateCurrentSongSkipVotes"
		]),
		...mapActions("modals/editSong", ["stopVideo"])
	}
};
</script>

<style lang="scss">
#stationPlayer {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
}

#currently-playing-container,
#next-up-container {
	.song-item {
		.thumbnail {
			min-width: 130px;
			width: 130px;
			height: 130px;
		}
	}
}
</style>

<style lang="scss" scoped>
#page-loader-container {
	height: inherit;

	#page-loader-content {
		height: inherit;
		position: absolute;
		max-width: 100%;
		width: 1800px;
		transform: translateX(-50%);
		left: 50%;
	}

	#page-loader-layout {
		height: inherit;
		width: 100%;
	}
}

#mobile-progress-animation {
	width: 50px;
	animation: rotate 0.8s infinite linear;
	border: 8px solid var(--primary-color);
	border-right-color: transparent;
	border-radius: 50%;
	height: 50px;
	position: absolute;
	top: 50%;
	left: 50%;
	display: none;
}

@keyframes rotate {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.nav,
.button.is-primary {
	background-color: var(--primary-color) !important;
}
.button.is-primary:hover,
.button.is-primary:focus {
	filter: brightness(90%);
}

.night-mode {
	#currently-playing-container,
	#next-up-container,
	#about-station-container,
	#control-bar-container,
	.player-container {
		background-color: var(--dark-grey-3) !important;
	}

	#video-container,
	#control-bar-container,
	.quadrant:not(#sidebar-container),
	.player-container {
		border: 0 !important;
	}

	#seeker-bar-container {
		background-color: var(--dark-grey-3) !important;
	}

	#dropdown-toggle {
		background-color: var(--dark-grey-2) !important;
		border: 0;

		i {
			color: var(--white);
		}
	}
}

#station-outer-container {
	margin: 0 auto;
	padding: 20px 40px;
	min-height: calc(100vh - 64px);
	width: 100%;
	max-width: 1800px;
	display: flex;

	#station-inner-container {
		width: 100%;
		min-height: calc(100vh - 428px);
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;

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
			margin: 10px;
		}

		.quadrant:not(#sidebar-container) {
			background-color: var(--white);
			border: 1px solid var(--light-grey-3);
		}

		#station-left-column,
		#station-right-column {
			padding: 0;
		}

		#about-station-container {
			padding: 20px;
			display: flex;
			flex-direction: column;
			flex-grow: unset;

			#station-info {
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

		#current-next-row {
			display: flex;
			flex-direction: row;

			#currently-playing-container,
			#next-up-container {
				overflow: hidden;
				flex-basis: 50%;
				.song-item {
					border: unset;
				}
				.nothing-here-text {
					height: 100%;
				}
			}

			> div:only-child {
				flex: 1 !important;
				flex-basis: 100% !important;
			}
		}

		.player-container {
			height: inherit;
			background-color: var(--white);
			display: flex;
			flex-direction: column;
			border: 1px solid var(--light-grey-3);
			border-radius: 5px;
			overflow: hidden;

			&.nothing-here-text {
				margin: 10px;
				flex: 1;
				min-height: 487px;
			}

			#video-container {
				position: relative;
				padding-bottom: 56.25%; /* proportion value to aspect ratio 16:9 (9 / 16 = 0.5625 or 56.25%) */
				height: 0;
				overflow: hidden;

				.player-cannot-autoplay {
					position: relative;
					width: 100%;
					height: 100%;
					bottom: calc(100% + 5px);
					background: var(--primary-color);
					display: flex;
					align-items: center;
					justify-content: center;

					p {
						color: var(--white);
						font-size: 26px;
						text-align: center;
					}
				}
			}

			#seeker-bar-container {
				background-color: var(--white);
				position: relative;
				height: 7px;
				display: block;
				width: 100%;

				#seeker-bar {
					background-color: var(--primary-color);
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
				background: var(--white);
				flex-direction: column;
				flex-flow: wrap;

				.button:not(#dropdown-toggle) {
					width: 75px;
				}

				#left-buttons,
				#right-buttons {
					margin: 3px;
				}

				#left-buttons {
					display: flex;

					.button:not(:first-of-type) {
						margin-left: 5px;
					}

					.disabled {
						filter: grayscale(0.4);
					}
				}

				#duration {
					margin: 3px;
					display: flex;
					align-items: center;

					p {
						font-size: 22px;
						/** prevents duration width slightly varying and shifting other controls slightly */
						width: 150px;
						text-align: center;
					}
				}

				#volume-control {
					margin: 3px;
					margin-top: 0;
					display: flex;
					align-items: center;
					cursor: pointer;

					.volume-slider {
						width: 100%;
						padding: 0 15px;
						background: transparent;
						min-width: 100px;
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
						background: var(--light-grey-3);
						border-radius: 0;
						border: 0;
					}

					input[type="range"]::-webkit-slider-thumb {
						box-shadow: 0;
						border: 0;
						height: 19px;
						width: 19px;
						border-radius: 15px;
						background: var(--primary-color);
						cursor: pointer;
						-webkit-appearance: none;
						margin-top: -6.5px;
					}

					input[type="range"]::-moz-range-track {
						width: 100%;
						height: 5.2px;
						cursor: pointer;
						box-shadow: 0;
						background: var(--light-grey-3);
						border-radius: 0;
						border: 0;
					}

					input[type="range"]::-moz-range-thumb {
						box-shadow: 0;
						border: 0;
						height: 19px;
						width: 19px;
						border-radius: 15px;
						background: var(--primary-color);
						cursor: pointer;
						-webkit-appearance: none;
						margin-top: -6.5px;
					}
					input[type="range"]::-ms-track {
						width: 100%;
						height: 5.2px;
						cursor: pointer;
						box-shadow: 0;
						background: var(--light-grey-3);
						border-radius: 1.3px;
					}

					input[type="range"]::-ms-fill-lower {
						background: var(--light-grey-3);
						border: 0;
						border-radius: 0;
						box-shadow: 0;
					}

					input[type="range"]::-ms-fill-upper {
						background: var(--light-grey-3);
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
						background: var(--primary-color);
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

						&.liked #dislike-song,
						&.disliked #like-song {
							background-color: var(--grey) !important;
						}
						#like-song.disabled,
						#dislike-song.disabled {
							filter: grayscale(0.4);
						}
					}

					#add-song-to-playlist {
						display: flex;
						flex-direction: column-reverse;

						#nav-dropdown {
							position: absolute;
							margin-left: 4px;
							margin-bottom: 36px;

							.nav-dropdown-items {
								position: relative;
								right: calc(100% - 110px);
							}
						}

						.control {
							width: fit-content;
							margin-bottom: 0 !important;
							button.disabled {
								filter: grayscale(0.4);
								border-radius: 3px;
								&::after {
									margin-right: 100%;
								}
							}
						}
					}
				}
			}
		}

		#sidebar-container {
			border-top: 0;
			position: relative;
			height: inherit;
			flex-grow: 1;
			min-height: 350px;
		}
	}
}

.footer {
	margin-top: 30px;
}

.nyan {
	background: linear-gradient(
		90deg,
		magenta 0%,
		red 15%,
		orange 30%,
		yellow 45%,
		lime 60%,
		cyan 75%,
		blue 90%,
		magenta 100%
	);

	background-size: 200%;
	animation: nyanMoving 4s linear infinite;
}

@keyframes nyanMoving {
	0% {
		background-position: 0% 0%;
	}
	100% {
		background-position: -200% 0%;
	}
}

.bg-bubbles {
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	position: absolute;
	z-index: -1;
	margin: 0px;
	pointer-events: none;
}

.bg-bubbles li {
	position: absolute;
	list-style: none;
	display: block;
	width: 40px;
	height: 40px;
	border-radius: 100px;
	background-color: var(--primary-color);
	opacity: 0.15;
	bottom: 0px;
	-webkit-animation: square 25s infinite;
	animation: square 25s infinite;
	-webkit-transition-timing-function: linear;
	transition-timing-function: linear;
}

.bg-bubbles li:nth-child(1) {
	left: 10%;
}

.bg-bubbles li:nth-child(2) {
	left: 20%;
	width: 80px;
	height: 80px;
	-webkit-animation-delay: 2s;
	animation-delay: 2s;
	-webkit-animation-duration: 17s;
	animation-duration: 17s;
}

.bg-bubbles li:nth-child(3) {
	left: 25%;
	-webkit-animation-delay: 4s;
	animation-delay: 4s;
}

.bg-bubbles li:nth-child(4) {
	left: 40%;
	width: 60px;
	height: 60px;
	-webkit-animation-duration: 22s;
	animation-duration: 22s;
	background-color: var(--primary-color);
	opacity: 0.25;
}

.bg-bubbles li:nth-child(5) {
	left: 70%;
}

.bg-bubbles li:nth-child(6) {
	left: 80%;
	width: 120px;
	height: 120px;
	-webkit-animation-delay: 3s;
	animation-delay: 3s;
	background-color: var(--primary-color);
	opacity: 0.2;
}

.bg-bubbles li:nth-child(7) {
	left: 32%;
	width: 160px;
	height: 160px;
	-webkit-animation-delay: 7s;
	animation-delay: 7s;
}

.bg-bubbles li:nth-child(8) {
	left: 55%;
	width: 20px;
	height: 20px;
	-webkit-animation-delay: 15s;
	animation-delay: 15s;
	-webkit-animation-duration: 40s;
	animation-duration: 40s;
}

.bg-bubbles li:nth-child(9) {
	left: 25%;
	width: 10px;
	height: 10px;
	-webkit-animation-delay: 2s;
	animation-delay: 2s;
	-webkit-animation-duration: 40s;
	animation-duration: 40s;
	background-color: var(--primary-color);
	opacity: 0.3;
}

.bg-bubbles li:nth-child(10) {
	left: 80%;
	width: 160px;
	height: 160px;
	-webkit-animation-delay: 11s;
	animation-delay: 11s;
}

/* Tablet view fix */
@media (max-width: 768px) {
	.bg-bubbles li:nth-child(10) {
		display: none;
	}
}

@-webkit-keyframes square {
	0% {
		-webkit-transform: translateY(0);
		transform: translateY(0);
	}
	100% {
		-webkit-transform: translateY(-700px) rotate(600deg);
		transform: translateY(-700px) rotate(600deg);
	}
}

@keyframes square {
	0% {
		-webkit-transform: translateY(0);
		transform: translateY(0);
	}
	100% {
		-webkit-transform: translateY(-700px) rotate(600deg);
		transform: translateY(-700px) rotate(600deg);
	}
}

/deep/ .nothing-here-text {
	display: flex;
	align-items: center;
	justify-content: center;
}

@media (min-width: 1500px) {
	#station-left-column {
		max-width: 650px;
	}
	#station-right-column {
		max-width: calc(100% - 650px);
	}
}

@media (max-width: 1700px) {
	#current-next-row {
		flex-direction: column !important;

		> div {
			flex: 1 !important;
		}
	}
}

@media (max-width: 1500px) {
	#mobile-progress-animation {
		display: block;
	}

	#page-loader-container {
		display: none;
	}

	#station-outer-container {
		max-width: 1500px;

		#station-inner-container {
			flex-direction: row;

			#station-left-column {
				#about-station-container #admin-buttons {
					flex-wrap: wrap;
				}

				#sidebar-container {
					min-height: 350px;
				}
			}

			#station-right-column {
				#current-next-row {
					flex-direction: column;
				}

				#control-bar-container {
					#duration,
					#volume-control,
					#right-buttons,
					#left-buttons {
						margin-bottom: 5px;
						justify-content: center;
					}

					#duration {
						order: 1;
					}

					#volume-control {
						order: 2;
						max-width: 400px;
					}

					#right-buttons {
						order: 3;
						flex-wrap: wrap;

						#ratings {
							flex-wrap: wrap;
						}
					}

					#left-buttons {
						order: 4;
						flex-wrap: wrap;
					}
				}
			}
		}
	}
}

@media (max-width: 1200px) {
	#station-outer-container {
		max-width: 900px;
		padding: 0;

		#station-inner-container {
			flex-direction: column-reverse;
			flex-wrap: nowrap;
		}
	}
}

@media (max-width: 990px) {
	#station-outer-container {
		min-height: calc(
			100vh - 256px
		); // Height of nav (64px) + height of footer (190px)
	}
}
</style>
