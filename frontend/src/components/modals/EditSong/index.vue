<template>
	<div>
		<modal
			:title="`${newSong ? 'Create' : 'Edit'} Song`"
			class="song-modal"
			:size="'wide'"
			:split="true"
			:intercept-close="true"
			@close="onCloseModal"
		>
			<template #toggleMobileSidebar>
				<slot name="toggleMobileSidebar" />
			</template>
			<template #sidebar>
				<slot name="sidebar" />
			</template>
			<template #body>
				<div v-if="!songId && !newSong" class="notice-container">
					<h4>No song has been selected</h4>
				</div>
				<div v-if="songDeleted" class="notice-container">
					<h4>The song you were editing has been deleted</h4>
				</div>
				<div
					v-if="
						songId && !songDataLoaded && !songNotFound && !newSong
					"
					class="notice-container"
				>
					<h4>Song hasn't loaded yet</h4>
				</div>
				<div
					v-if="songId && songNotFound && !newSong"
					class="notice-container"
				>
					<h4>Song was not found</h4>
				</div>
				<div
					class="left-section"
					v-show="songDataLoaded && !songDeleted"
				>
					<div class="top-section">
						<div class="player-section">
							<div id="editSongPlayer" />

							<div v-show="youtubeError" class="player-error">
								<h2>{{ youtubeErrorMessage }}</h2>
							</div>

							<canvas
								ref="durationCanvas"
								id="durationCanvas"
								v-show="!youtubeError"
								height="20"
								width="530"
								@click="setTrackPosition($event)"
							/>
							<div class="player-footer">
								<div class="player-footer-left">
									<button
										class="button is-primary"
										@click="play()"
										@keyup.enter="play()"
										v-if="video.paused"
										content="Resume Playback"
										v-tippy
									>
										<i class="material-icons">play_arrow</i>
									</button>
									<button
										class="button is-primary"
										@click="settings('pause')"
										@keyup.enter="settings('pause')"
										v-else
										content="Pause Playback"
										v-tippy
									>
										<i class="material-icons">pause</i>
									</button>
									<button
										class="button is-danger"
										@click.exact="settings('stop')"
										@click.shift="settings('hardStop')"
										@keyup.enter.exact="settings('stop')"
										@keyup.shift.enter="
											settings('hardStop')
										"
										content="Stop Playback"
										v-tippy
									>
										<i class="material-icons">stop</i>
									</button>
									<tippy
										class="playerRateDropdown"
										:touch="true"
										:interactive="true"
										placement="bottom"
										theme="dropdown"
										ref="dropdown"
										trigger="click"
										append-to="parent"
										@show="
											() => {
												showRateDropdown = true;
											}
										"
										@hide="
											() => {
												showRateDropdown = false;
											}
										"
									>
										<div
											ref="trigger"
											class="control has-addons"
											content="Set Playback Rate"
											v-tippy
										>
											<button class="button is-primary">
												<i class="material-icons"
													>fast_forward</i
												>
											</button>
											<button
												class="button dropdown-toggle"
											>
												<i class="material-icons">
													{{
														showRateDropdown
															? "expand_more"
															: "expand_less"
													}}
												</i>
											</button>
										</div>

										<template #content>
											<div class="nav-dropdown-items">
												<button
													class="nav-item button"
													:class="{
														active:
															video.playbackRate ===
															0.5
													}"
													title="0.5x"
													@click="
														setPlaybackRate(0.5)
													"
												>
													<p>0.5x</p>
												</button>
												<button
													class="nav-item button"
													:class="{
														active:
															video.playbackRate ===
															1
													}"
													title="1x"
													@click="setPlaybackRate(1)"
												>
													<p>1x</p>
												</button>
												<button
													class="nav-item button"
													:class="{
														active:
															video.playbackRate ===
															2
													}"
													title="2x"
													@click="setPlaybackRate(2)"
												>
													<p>2x</p>
												</button>
											</div>
										</template>
									</tippy>
								</div>
								<div class="player-footer-center">
									<span>
										<span>
											{{ youtubeVideoCurrentTime }}
										</span>
										/
										<span>
											{{ youtubeVideoDuration }}
											{{ youtubeVideoNote }}
										</span>
									</span>
								</div>
								<div class="player-footer-right">
									<p id="volume-control">
										<i
											class="material-icons"
											@click="toggleMute()"
											:content="`${
												muted ? 'Unmute' : 'Mute'
											}`"
											v-tippy
											>{{
												muted
													? "volume_mute"
													: volumeSliderValue >= 50
													? "volume_up"
													: "volume_down"
											}}</i
										>
										<input
											v-model="volumeSliderValue"
											type="range"
											min="0"
											max="100"
											class="volume-slider active"
											@change="changeVolume()"
											@input="changeVolume()"
										/>
									</p>
								</div>
							</div>
						</div>
						<img
							class="thumbnail-preview"
							:src="song.thumbnail"
							onerror="this.src='/assets/notes-transparent.png'"
							ref="thumbnailElement"
							@load="onThumbnailLoad"
							v-if="songDataLoaded && !songDeleted"
						/>
					</div>

					<div
						class="edit-section"
						v-if="songDataLoaded && !songDeleted"
					>
						<div class="control is-grouped">
							<div class="title-container">
								<label class="label">Title</label>
								<p class="control has-addons">
									<input
										class="input"
										type="text"
										ref="title-input"
										v-model="song.title"
										placeholder="Enter song title..."
										@keyup.shift.enter="
											getAlbumData('title')
										"
									/>
									<button
										class="button album-get-button"
										@click="getAlbumData('title')"
									>
										<i
											class="material-icons"
											v-tippy
											content="Fill from Discogs"
											>album</i
										>
									</button>
								</p>
							</div>

							<div class="duration-container">
								<label class="label">Duration</label>
								<p class="control has-addons">
									<input
										class="input"
										type="text"
										placeholder="Enter song duration..."
										v-model.number="song.duration"
										@keyup.shift.enter="fillDuration()"
									/>
									<button
										class="button duration-fill-button"
										@click="fillDuration()"
									>
										<i
											class="material-icons"
											v-tippy
											content="Sync duration with YouTube"
											>sync</i
										>
									</button>
								</p>
							</div>

							<div class="skip-duration-container">
								<label class="label">Skip duration</label>
								<p class="control">
									<input
										class="input"
										type="text"
										placeholder="Enter skip duration..."
										v-model.number="song.skipDuration"
									/>
								</p>
							</div>
						</div>

						<div class="control is-grouped">
							<div class="album-art-container">
								<label class="label">
									Album art
									<i
										v-if="
											thumbnailNotSquare &&
											!thumbnailIsYouTubeThumbnail
										"
										class="material-icons thumbnail-warning"
										content="Thumbnail not square, it will be stretched"
										v-tippy="{ theme: 'info' }"
									>
										warning
									</i>
								</label>

								<p class="control has-addons">
									<input
										class="input"
										type="text"
										v-model="song.thumbnail"
										placeholder="Enter link to album art..."
										@keyup.shift.enter="
											getAlbumData('albumArt')
										"
									/>
									<button
										class="button album-get-button"
										@click="getAlbumData('albumArt')"
									>
										<i
											class="material-icons"
											v-tippy
											content="Fill from Discogs"
											>album</i
										>
									</button>
								</p>
							</div>
							<div class="youtube-id-container">
								<label class="label">YouTube ID</label>
								<p class="control">
									<input
										class="input"
										type="text"
										placeholder="Enter YouTube ID..."
										v-model="song.youtubeId"
									/>
								</p>
							</div>
							<div class="verified-container">
								<label class="label">Verified</label>
								<p class="is-expanded checkbox-control">
									<label class="switch">
										<input
											type="checkbox"
											id="verified"
											v-model="song.verified"
										/>
										<span class="slider round"></span>
									</label>
								</p>
							</div>
						</div>

						<div class="control is-grouped">
							<div class="artists-container">
								<label class="label">Artists</label>
								<p class="control has-addons">
									<auto-suggest
										v-model="artistInputValue"
										ref="new-artist"
										placeholder="Add artist..."
										:all-items="
											autosuggest.allItems.artists
										"
										@submitted="addTag('artists')"
										@keyup.shift.enter="
											getAlbumData('artists')
										"
									/>
									<button
										class="button album-get-button"
										@click="getAlbumData('artists')"
									>
										<i
											class="material-icons"
											v-tippy
											content="Fill from Discogs"
											>album</i
										>
									</button>
									<button
										class="button is-info add-button"
										@click="addTag('artists')"
									>
										<i class="material-icons">add</i>
									</button>
								</p>
								<div class="list-container">
									<div
										class="list-item"
										v-for="artist in song.artists"
										:key="artist"
									>
										<div
											class="list-item-circle"
											@click="
												removeTag('artists', artist)
											"
										>
											<i class="material-icons">close</i>
										</div>
										<p>{{ artist }}</p>
									</div>
								</div>
							</div>
							<div class="genres-container">
								<label class="label">
									<span>Genres</span>
									<i
										class="material-icons"
										@click="toggleGenreHelper"
										@dblclick="resetGenreHelper"
										v-tippy
										content="View list of genres"
										>info</i
									>
								</label>
								<p class="control has-addons">
									<auto-suggest
										v-model="genreInputValue"
										ref="new-genre"
										placeholder="Add genre..."
										:all-items="autosuggest.allItems.genres"
										@submitted="addTag('genres')"
										@keyup.shift.enter="
											getAlbumData('genres')
										"
									/>
									<button
										class="button album-get-button"
										@click="getAlbumData('genres')"
									>
										<i
											class="material-icons"
											v-tippy
											content="Fill from Discogs"
											>album</i
										>
									</button>
									<button
										class="button is-info add-button"
										@click="addTag('genres')"
									>
										<i class="material-icons">add</i>
									</button>
								</p>
								<div class="list-container">
									<div
										class="list-item"
										v-for="genre in song.genres"
										:key="genre"
									>
										<div
											class="list-item-circle"
											@click="removeTag('genres', genre)"
										>
											<i class="material-icons">close</i>
										</div>
										<p>{{ genre }}</p>
									</div>
								</div>
							</div>
							<div class="tags-container">
								<label class="label">Tags</label>
								<p class="control has-addons">
									<auto-suggest
										v-model="tagInputValue"
										ref="new-tag"
										placeholder="Add tag..."
										:all-items="autosuggest.allItems.tags"
										@submitted="addTag('tags')"
									/>
									<button
										class="button is-info add-button"
										@click="addTag('tags')"
									>
										<i class="material-icons">add</i>
									</button>
								</p>
								<div class="list-container">
									<div
										class="list-item"
										v-for="tag in song.tags"
										:key="tag"
									>
										<div
											class="list-item-circle"
											@click="removeTag('tags', tag)"
										>
											<i class="material-icons">close</i>
										</div>
										<p>{{ tag }}</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div
					class="right-section"
					v-if="songDataLoaded && !songDeleted"
				>
					<div id="tabs-container">
						<div id="tab-selection">
							<button
								class="button is-default"
								:class="{ selected: tab === 'discogs' }"
								ref="discogs-tab"
								@click="showTab('discogs')"
							>
								Discogs
							</button>
							<button
								v-if="!newSong"
								class="button is-default"
								:class="{ selected: tab === 'reports' }"
								ref="reports-tab"
								@click="showTab('reports')"
							>
								Reports ({{ reports.length }})
							</button>
							<button
								class="button is-default"
								:class="{ selected: tab === 'youtube' }"
								ref="youtube-tab"
								@click="showTab('youtube')"
							>
								YouTube
							</button>
							<button
								class="button is-default"
								:class="{ selected: tab === 'musare-songs' }"
								ref="musare-songs-tab"
								@click="showTab('musare-songs')"
							>
								Songs
							</button>
						</div>
						<discogs
							class="tab"
							v-show="tab === 'discogs'"
							:bulk="bulk"
						/>
						<reports
							v-if="!newSong"
							class="tab"
							v-show="tab === 'reports'"
						/>
						<youtube class="tab" v-show="tab === 'youtube'" />
						<musare-songs
							class="tab"
							v-show="tab === 'musare-songs'"
						/>
					</div>
				</div>
			</template>
			<template #footer>
				<div v-if="bulk">
					<button class="button is-primary" @click="editNextSong()">
						Next
					</button>
					<button
						class="button is-primary"
						@click="toggleFlag()"
						v-if="songId && !songDeleted"
					>
						{{ flagged ? "Unflag" : "Flag" }}
					</button>
				</div>
				<div v-if="!newSong && !songDeleted">
					<save-button
						ref="saveButton"
						@clicked="save(song, false, 'saveButton')"
					/>
					<save-button
						ref="saveAndCloseButton"
						:default-message="
							bulk ? `Save and next` : `Save and close`
						"
						@clicked="save(song, true, 'saveAndCloseButton')"
					/>

					<div class="right">
						<button
							class="button is-danger icon-with-button material-icons"
							@click.prevent="
								confirmAction({
									message:
										'Removing this song will remove it from all playlists and cause a ratings recalculation.',
									action: 'remove',
									params: song._id
								})
							"
							content="Delete Song"
							v-tippy
						>
							delete_forever
						</button>
					</div>
				</div>
				<div v-else-if="newSong">
					<save-button
						ref="createButton"
						default-message="Create Song"
						@clicked="save(song, false, 'createButton', true)"
					/>
				</div>
			</template>
		</modal>
		<floating-box id="genreHelper" ref="genreHelper" :column="false">
			<template #body>
				<span
					v-for="item in autosuggest.allItems.genres"
					:key="`genre-helper-${item}`"
				>
					{{ item }}
				</span>
			</template>
		</floating-box>
		<confirm v-if="modals.editSongConfirm" @confirmed="handleConfirmed()" />
	</div>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";
import { defineAsyncComponent } from "vue";
import Toast from "toasters";

import aw from "@/aw";
import ws from "@/ws";
import validation from "@/validation";
import keyboardShortcuts from "@/keyboardShortcuts";

import Modal from "../../Modal.vue";
import FloatingBox from "../../FloatingBox.vue";
import SaveButton from "../../SaveButton.vue";
import AutoSuggest from "@/components/AutoSuggest.vue";

import Discogs from "./Tabs/Discogs.vue";
import Reports from "./Tabs/Reports.vue";
import Youtube from "./Tabs/Youtube.vue";
import MusareSongs from "./Tabs/Songs.vue";

export default {
	components: {
		Modal,
		FloatingBox,
		SaveButton,
		AutoSuggest,
		Discogs,
		Reports,
		Youtube,
		MusareSongs,
		Confirm: defineAsyncComponent(() =>
			import("@/components/modals/Confirm.vue")
		)
	},
	props: {
		// songId: { type: String, default: null },
		discogsAlbum: { type: Object, default: null },
		sector: { type: String, default: "admin" },
		bulk: { type: Boolean, default: false },
		flagged: { type: Boolean, default: false }
	},
	emits: [
		"error",
		"savedSuccess",
		"savedError",
		"flagSong",
		"nextSong",
		"close"
	],
	data() {
		return {
			songDataLoaded: false,
			songDeleted: false,
			youtubeError: false,
			youtubeErrorMessage: "",
			focusedElementBefore: null,
			youtubeVideoDuration: "0.000",
			youtubeVideoCurrentTime: 0,
			youtubeVideoNote: "",
			useHTTPS: false,
			muted: false,
			volumeSliderValue: 0,
			artistInputValue: "",
			genreInputValue: "",
			tagInputValue: "",
			activityWatchVideoDataInterval: null,
			activityWatchVideoLastStatus: "",
			activityWatchVideoLastStartDuration: "",
			confirm: {
				message: "",
				action: "",
				params: null
			},
			recommendedGenres: [
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
			autosuggest: {
				allItems: {
					artists: [],
					genres: [],
					tags: []
				}
			},
			songNotFound: false,
			showRateDropdown: false,
			thumbnailNotSquare: false,
			thumbnailWidth: null,
			thumbnailHeight: null
		};
	},
	computed: {
		thumbnailIsYouTubeThumbnail() {
			return (
				this.songDataLoaded &&
				this.song.thumbnail &&
				this.song.thumbnail.startsWith("https://i.ytimg.com")
			);
		},
		...mapState("modals/editSong", {
			tab: state => state.tab,
			video: state => state.video,
			song: state => state.song,
			songId: state => state.songId,
			prefillData: state => state.prefillData,
			originalSong: state => state.originalSong,
			reports: state => state.reports,
			newSong: state => state.newSong
		}),
		...mapState("modalVisibility", {
			modals: state => state.modals,
			currentlyActive: state => state.currentlyActive
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	watch: {
		/* eslint-disable */
		"song.duration": function () {
			this.drawCanvas();
		},
		"song.skipDuration": function () {
			this.drawCanvas();
		},
		/* eslint-enable */
		songId(songId, oldSongId) {
			console.log("NEW SONG ID", songId);
			this.unloadSong(oldSongId);
			this.loadSong(songId);
		}
	},
	async mounted() {
		console.log("MOUNTED");
		this.activityWatchVideoDataInterval = setInterval(() => {
			this.sendActivityWatchVideoData();
		}, 1000);

		this.useHTTPS = await lofig.get("cookie.secure");

		ws.onConnect(this.init);

		let volume = parseFloat(localStorage.getItem("volume"));
		volume =
			typeof volume === "number" && !Number.isNaN(volume) ? volume : 20;
		localStorage.setItem("volume", volume);
		this.volumeSliderValue = volume;

		if (!this.newSong) {
			this.socket.on(
				"event:admin.song.removed",
				res => {
					if (res.data.songId === this.song._id) {
						this.songDeleted = true;
					}
				},
				{ modal: this.bulk ? "editSongs" : "editSong" }
			);
		}

		keyboardShortcuts.registerShortcut("editSong.pauseResumeVideo", {
			keyCode: 101,
			preventDefault: true,
			handler: () => {
				if (this.video.paused) this.play();
				else this.settings("pause");
			}
		});

		keyboardShortcuts.registerShortcut("editSong.stopVideo", {
			keyCode: 101,
			ctrl: true,
			preventDefault: true,
			handler: () => {
				this.settings("stop");
			}
		});

		keyboardShortcuts.registerShortcut("editSong.hardStopVideo", {
			keyCode: 101,
			ctrl: true,
			shift: true,
			preventDefault: true,
			handler: () => {
				this.settings("hardStop");
			}
		});

		keyboardShortcuts.registerShortcut("editSong.skipToLast10Secs", {
			keyCode: 102,
			preventDefault: true,
			handler: () => {
				this.settings("skipToLast10Secs");
			}
		});

		keyboardShortcuts.registerShortcut("editSong.lowerVolumeLarge", {
			keyCode: 98,
			preventDefault: true,
			handler: () => {
				this.volumeSliderValue = Math.max(
					0,
					this.volumeSliderValue - 10
				);
				this.changeVolume();
			}
		});

		keyboardShortcuts.registerShortcut("editSong.lowerVolumeSmall", {
			keyCode: 98,
			ctrl: true,
			preventDefault: true,
			handler: () => {
				this.volumeSliderValue = Math.max(
					0,
					this.volumeSliderValue - 1
				);
				this.changeVolume();
			}
		});

		keyboardShortcuts.registerShortcut("editSong.increaseVolumeLarge", {
			keyCode: 104,
			preventDefault: true,
			handler: () => {
				this.volumeSliderValue = Math.min(
					100,
					this.volumeSliderValue + 10
				);
				this.changeVolume();
			}
		});

		keyboardShortcuts.registerShortcut("editSong.increaseVolumeSmall", {
			keyCode: 104,
			ctrl: true,
			preventDefault: true,
			handler: () => {
				this.volumeSliderValue = Math.min(
					100,
					this.volumeSliderValue + 1
				);
				this.changeVolume();
			}
		});

		keyboardShortcuts.registerShortcut("editSong.save", {
			keyCode: 83,
			ctrl: true,
			preventDefault: true,
			handler: () => {
				this.save(this.song, false, "saveButton");
			}
		});

		keyboardShortcuts.registerShortcut("editSong.saveClose", {
			keyCode: 83,
			ctrl: true,
			alt: true,
			preventDefault: true,
			handler: () => {
				this.save(this.song, true, "saveAndCloseButton");
			}
		});

		keyboardShortcuts.registerShortcut("editSong.focusTitle", {
			keyCode: 36,
			preventDefault: true,
			handler: () => {
				this.$refs["title-input"].focus();
			}
		});

		keyboardShortcuts.registerShortcut("editSong.useAllDiscogs", {
			keyCode: 68,
			alt: true,
			ctrl: true,
			preventDefault: true,
			handler: () => {
				this.getAlbumData("title");
				this.getAlbumData("albumArt");
				this.getAlbumData("artists");
				this.getAlbumData("genres");
			}
		});

		keyboardShortcuts.registerShortcut("editSong.closeModal", {
			keyCode: 27,
			handler: () => {
				if (
					this.currentlyActive[0] === "editSong" ||
					this.currentlyActive[0] === "editSongs"
				) {
					this.onCloseModal();
				}
			}
		});

		/*

		editSong.pauseResume - Num 5 - Pause/resume song
		editSong.stopVideo - Ctrl - Num 5 - Stop
		editSong.hardStopVideo - Shift - Ctrl - Num 5 - Stop
		editSong.skipToLast10Secs - Num 6 - Skip to last 10 seconds

		editSong.lowerVolumeLarge - Num 2 - Volume down by 10
		editSong.lowerVolumeSmall - Ctrl - Num 2 - Volume down by 1
		editSong.increaseVolumeLarge - Num 8 - Volume up by 10
		editSong.increaseVolumeSmall - Ctrl - Num 8 - Volume up by 1

		editSong.focusTitle - Home - Focus the title input
		editSong.focusDicogs - End - Focus the discogs input

		editSong.save - Ctrl - S - Saves song
		editSong.save - Ctrl - Alt - S - Saves song and closes the modal
		editSong.save - Ctrl - Alt - V - Saves song, verifies songs and then closes the modal
		editSong.close - F4 - Closes modal without saving

		editSong.useAllDiscogs - Ctrl - Alt - D - Sets all fields to the Discogs data

		Inside Discogs inputs: Ctrl - D - Sets this field to the Discogs data

		*/
	},
	beforeUnmount() {
		console.log("UNMOUNT");
		if (!this.newSong) this.unloadSong(this.songId);

		this.playerReady = false;
		clearInterval(this.interval);
		clearInterval(this.activityWatchVideoDataInterval);

		const shortcutNames = [
			"editSong.pauseResume",
			"editSong.stopVideo",
			"editSong.hardStopVideo",
			"editSong.skipToLast10Secs",
			"editSong.lowerVolumeLarge",
			"editSong.lowerVolumeSmall",
			"editSong.increaseVolumeLarge",
			"editSong.increaseVolumeSmall",
			"editSong.focusTitle",
			"editSong.focusDicogs",
			"editSong.save",
			"editSong.saveClose",
			"editSong.useAllDiscogs",
			"editSong.closeModal"
		];

		shortcutNames.forEach(shortcutName => {
			keyboardShortcuts.unregisterShortcut(shortcutName);
		});
	},
	methods: {
		onThumbnailLoad() {
			if (this.$refs.thumbnailElement) {
				const thumbnailHeight =
					this.$refs.thumbnailElement.naturalHeight;
				const thumbnailWidth = this.$refs.thumbnailElement.naturalWidth;

				this.thumbnailNotSquare = thumbnailHeight !== thumbnailWidth;
				this.thumbnailHeight = thumbnailHeight;
				this.thumbnailWidth = thumbnailWidth;
			} else {
				this.thumbnailNotSquare = false;
				this.thumbnailHeight = null;
				this.thumbnailWidth = null;
			}
		},
		init() {
			if (this.newSong) {
				this.setSong({
					youtubeId: "",
					title: "",
					artists: [],
					genres: [],
					tags: [],
					duration: 0,
					skipDuration: 0,
					thumbnail: "",
					verified: false
				});
				this.songDataLoaded = true;
				this.showTab("youtube");
			} else if (this.songId) this.loadSong(this.songId);
			else if (!this.bulk) {
				new Toast("You can't open EditSong without editing a song");
				return this.closeModal("editSong");
			}

			this.interval = setInterval(() => {
				if (
					this.song.duration !== -1 &&
					this.video.paused === false &&
					this.playerReady &&
					(this.video.player.getCurrentTime() -
						this.song.skipDuration >
						this.song.duration ||
						(this.video.player.getCurrentTime() > 0 &&
							this.video.player.getCurrentTime() >=
								this.video.player.getDuration()))
				) {
					this.stopVideo();
					this.pauseVideo(true);
					this.drawCanvas();
				}
				if (
					this.playerReady &&
					this.video.player.getVideoData &&
					this.video.player.getVideoData() &&
					this.video.player.getVideoData().video_id ===
						this.song.youtubeId
				) {
					const currentTime = this.video.player.getCurrentTime();

					if (currentTime !== undefined)
						this.youtubeVideoCurrentTime = currentTime.toFixed(3);

					if (this.youtubeVideoDuration === "0.000") {
						const duration = this.video.player.getDuration();

						if (duration !== undefined) {
							this.youtubeVideoDuration = duration.toFixed(3);
							this.youtubeVideoNote = "(~)";

							this.drawCanvas();
						}
					}
				}

				if (this.video.paused === false) this.drawCanvas();
			}, 200);

			if (window.YT && window.YT.Player) {
				this.video.player = new window.YT.Player("editSongPlayer", {
					height: 298,
					width: 530,
					videoId: null,
					host: "https://www.youtube-nocookie.com",
					playerVars: {
						controls: 0,
						iv_load_policy: 3,
						rel: 0,
						showinfo: 0,
						autoplay: 0
					},
					startSeconds: this.song.skipDuration,
					events: {
						onReady: () => {
							let volume = parseFloat(
								localStorage.getItem("volume")
							);
							volume = typeof volume === "number" ? volume : 20;
							this.video.player.setVolume(volume);
							if (volume > 0) this.video.player.unMute();

							this.playerReady = true;

							if (this.song && this.song._id)
								this.video.player.cueVideoById(
									this.song.youtubeId,
									this.song.skipDuration
								);

							this.setPlaybackRate(null);

							this.drawCanvas();
						},
						onStateChange: event => {
							this.drawCanvas();

							if (event.data === 1) {
								this.video.paused = false;
								let youtubeDuration =
									this.video.player.getDuration();
								const newYoutubeVideoDuration =
									youtubeDuration.toFixed(3);

								const songDurationNumber = Number(
									this.song.duration
								);
								const songDurationNumber2 =
									Number(this.song.duration) + 1;
								const songDurationNumber3 =
									Number(this.song.duration) - 1;
								const fixedSongDuration =
									songDurationNumber.toFixed(3);
								const fixedSongDuration2 =
									songDurationNumber2.toFixed(3);
								const fixedSongDuration3 =
									songDurationNumber3.toFixed(3);

								if (
									this.youtubeVideoDuration !==
										newYoutubeVideoDuration &&
									(fixedSongDuration ===
										this.youtubeVideoDuration ||
										fixedSongDuration2 ===
											this.youtubeVideoDuration ||
										fixedSongDuration3 ===
											this.youtubeVideoDuration)
								)
									this.song.duration =
										newYoutubeVideoDuration;

								this.youtubeVideoDuration =
									newYoutubeVideoDuration;
								this.youtubeVideoNote = "";

								if (this.song.duration === -1)
									this.song.duration = youtubeDuration;

								youtubeDuration -= this.song.skipDuration;
								if (this.song.duration > youtubeDuration + 1) {
									this.stopVideo();
									this.pauseVideo(true);
									return new Toast(
										"Video can't play. Specified duration is bigger than the YouTube song duration."
									);
								}
								if (this.song.duration <= 0) {
									this.stopVideo();
									this.pauseVideo(true);
									return new Toast(
										"Video can't play. Specified duration has to be more than 0 seconds."
									);
								}

								if (
									this.video.player.getCurrentTime() <
									this.song.skipDuration
								) {
									return this.seekTo(this.song.skipDuration);
								}

								this.setPlaybackRate(null);
							} else if (event.data === 2) {
								this.video.paused = true;
							}

							return false;
						}
					}
				});
			} else {
				this.youtubeError = true;
				this.youtubeErrorMessage = "Player could not be loaded.";
			}

			["artists", "genres", "tags"].forEach(type => {
				this.socket.dispatch(
					`songs.get${type.charAt(0).toUpperCase()}${type.slice(1)}`,
					res => {
						if (res.status === "success") {
							const { items } = res.data;
							if (type === "genres")
								this.autosuggest.allItems[type] = Array.from(
									new Set([
										...this.recommendedGenres,
										...items
									])
								);
							else this.autosuggest.allItems[type] = items;
						} else {
							new Toast(res.message);
						}
					}
				);
			});

			return null;
		},
		unloadSong(songId) {
			this.songDataLoaded = false;
			this.songDeleted = false;
			this.stopVideo();
			this.pauseVideo(true);
			this.resetSong(songId);
			this.thumbnailNotSquare = false;
			this.thumbnailWidth = null;
			this.thumbnailHeight = null;
			this.youtubeVideoCurrentTime = "0.000";
			this.youtubeVideoDuration = "0.000";
			this.socket.dispatch("apis.leaveRoom", `edit-song.${songId}`);
			if (this.$refs.saveButton) this.$refs.saveButton.status = "default";
		},
		loadSong(songId) {
			console.log(`LOAD SONG ${songId}`);
			this.songNotFound = false;
			this.socket.dispatch(`songs.getSongFromSongId`, songId, res => {
				if (res.status === "success") {
					let { song } = res.data;

					song = Object.assign(song, this.prefillData);

					this.setSong(song);

					this.songDataLoaded = true;

					this.socket.dispatch(
						"apis.joinRoom",
						`edit-song.${this.song._id}`
					);

					if (this.video.player && this.video.player.cueVideoById) {
						this.video.player.cueVideoById(
							this.song.youtubeId,
							this.song.skipDuration
						);
					}
				} else {
					new Toast("Song with that ID not found");
					if (this.bulk) this.songNotFound = true;
					if (!this.bulk) this.closeModal("editSong");
				}
			});

			this.socket.dispatch("reports.getReportsForSong", songId, res => {
				this.updateReports(res.data.reports);
			});
		},
		importAlbum(result) {
			this.selectDiscogsAlbum(result);
			this.openModal("importAlbum");
			this.closeModal("editSong");
		},
		save(songToCopy, closeOrNext, saveButtonRefName, newSong = false) {
			const song = JSON.parse(JSON.stringify(songToCopy));

			if (!newSong) this.$emit("saving", song._id);

			const saveButtonRef = this.$refs[saveButtonRefName];

			if (!this.youtubeError && this.youtubeVideoDuration === "0.000") {
				saveButtonRef.handleFailedSave();
				if (!newSong) this.$emit("savedError", song._id);
				return new Toast("The video appears to not be working.");
			}

			if (!song.title) {
				saveButtonRef.handleFailedSave();
				if (!newSong) this.$emit("savedError", song._id);
				return new Toast("Please fill in all fields");
			}

			if (!song.thumbnail) {
				saveButtonRef.handleFailedSave();
				if (!newSong) this.$emit("savedError", song._id);
				return new Toast("Please fill in all fields");
			}

			// const thumbnailHeight = this.$refs.thumbnailElement.naturalHeight;
			// const thumbnailWidth = this.$refs.thumbnailElement.naturalWidth;

			// if (thumbnailHeight < 80 || thumbnailWidth < 80) {
			// 	saveButtonRef.handleFailedSave();
			// 	return new Toast(
			// 		"Thumbnail width and height must be at least 80px."
			// 	);
			// }

			// if (thumbnailHeight > 4000 || thumbnailWidth > 4000) {
			// 	saveButtonRef.handleFailedSave();
			// 	return new Toast(
			// 		"Thumbnail width and height must be less than 4000px."
			// 	);
			// }

			// if (thumbnailHeight - thumbnailWidth > 5) {
			// 	saveButtonRef.handleFailedSave();
			// 	return new Toast("Thumbnail cannot be taller than it is wide.");
			// }

			// Youtube Id
			if (
				!newSong &&
				this.youtubeError &&
				this.originalSong.youtubeId !== song.youtubeId
			) {
				saveButtonRef.handleFailedSave();
				if (!newSong) this.$emit("savedError", song._id);
				return new Toast(
					"You're not allowed to change the YouTube id while the player is not working"
				);
			}

			// Duration
			if (
				Number(song.skipDuration) + Number(song.duration) >
					this.youtubeVideoDuration &&
				((!newSong && !this.youtubeError) ||
					this.originalSong.duration !== song.duration)
			) {
				saveButtonRef.handleFailedSave();
				if (!newSong) this.$emit("savedError", song._id);
				return new Toast(
					"Duration can't be higher than the length of the video"
				);
			}

			// Title
			if (!validation.isLength(song.title, 1, 100)) {
				saveButtonRef.handleFailedSave();
				if (!newSong) this.$emit("savedError", song._id);
				return new Toast(
					"Title must have between 1 and 100 characters."
				);
			}

			// Artists
			if (
				(song.verified && song.artists.length < 1) ||
				song.artists.length > 10
			) {
				saveButtonRef.handleFailedSave();
				if (!newSong) this.$emit("savedError", song._id);
				return new Toast(
					"Invalid artists. You must have at least 1 artist and a maximum of 10 artists."
				);
			}

			let error;
			song.artists.forEach(artist => {
				if (!validation.isLength(artist, 1, 64)) {
					error = "Artist must have between 1 and 64 characters.";
					return error;
				}
				if (artist === "NONE") {
					error =
						'Invalid artist format. Artists are not allowed to be named "NONE".';
					return error;
				}

				return false;
			});

			if (error) {
				saveButtonRef.handleFailedSave();
				if (!newSong) this.$emit("savedError", song._id);
				return new Toast(error);
			}

			// Genres
			error = undefined;
			song.genres.forEach(genre => {
				if (!validation.isLength(genre, 1, 32)) {
					error = "Genre must have between 1 and 32 characters.";
					return error;
				}
				if (!validation.regex.ascii.test(genre)) {
					error =
						"Invalid genre format. Only ascii characters are allowed.";
					return error;
				}

				return false;
			});

			if (
				(song.verified && song.genres.length < 1) ||
				song.genres.length > 16
			)
				error = "You must have between 1 and 16 genres.";

			if (error) {
				saveButtonRef.handleFailedSave();
				if (!newSong) this.$emit("savedError", song._id);
				return new Toast(error);
			}

			error = undefined;
			song.tags.forEach(tag => {
				if (
					!/^[a-zA-Z0-9_]{1,64}$|^[a-zA-Z0-9_]{1,64}\[[a-zA-Z0-9_]{1,64}\]$/.test(
						tag
					)
				) {
					error = "Invalid tag format.";
					return error;
				}

				return false;
			});

			if (error) {
				saveButtonRef.handleFailedSave();
				if (!newSong) this.$emit("savedError", song._id);
				return new Toast(error);
			}

			// Thumbnail
			if (!validation.isLength(song.thumbnail, 1, 256)) {
				saveButtonRef.handleFailedSave();
				if (!newSong) this.$emit("savedError", song._id);
				return new Toast(
					"Thumbnail must have between 8 and 256 characters."
				);
			}
			if (this.useHTTPS && song.thumbnail.indexOf("https://") !== 0) {
				saveButtonRef.handleFailedSave();
				if (!newSong) this.$emit("savedError", song._id);
				return new Toast('Thumbnail must start with "https://".');
			}

			if (
				!this.useHTTPS &&
				song.thumbnail.indexOf("http://") !== 0 &&
				song.thumbnail.indexOf("https://") !== 0
			) {
				saveButtonRef.handleFailedSave();
				if (!newSong) this.$emit("savedError", song._id);
				return new Toast('Thumbnail must start with "http://".');
			}

			saveButtonRef.status = "saving";

			if (newSong)
				return this.socket.dispatch(`songs.create`, song, res => {
					new Toast(res.message);

					if (res.status === "error") {
						saveButtonRef.handleFailedSave();
						return;
					}

					saveButtonRef.handleSuccessfulSave();

					this.closeModal("editSong");
				});
			return this.socket.dispatch(`songs.update`, song._id, song, res => {
				new Toast(res.message);

				if (res.status === "error") {
					saveButtonRef.handleFailedSave();
					this.$emit("savedError", song._id);
					return;
				}

				this.updateOriginalSong(song);

				saveButtonRef.handleSuccessfulSave();
				this.$emit("savedSuccess", song._id);

				if (!closeOrNext) return;

				if (this.bulk) this.$emit("nextSong");
				else this.closeModal("editSong");
			});
		},
		editNextSong() {
			this.$emit("nextSong");
		},
		toggleFlag() {
			this.$emit("toggleFlag");
		},
		getAlbumData(type) {
			if (!this.song.discogs) return;
			if (type === "title")
				this.updateSongField({
					field: "title",
					value: this.song.discogs.track.title
				});
			if (type === "albumArt")
				this.updateSongField({
					field: "thumbnail",
					value: this.song.discogs.album.albumArt
				});
			if (type === "genres")
				this.updateSongField({
					field: "genres",
					value: JSON.parse(
						JSON.stringify(this.song.discogs.album.genres)
					)
				});
			if (type === "artists")
				this.updateSongField({
					field: "artists",
					value: JSON.parse(
						JSON.stringify(this.song.discogs.album.artists)
					)
				});
		},
		fillDuration() {
			this.song.duration =
				this.youtubeVideoDuration - this.song.skipDuration;
		},
		settings(type) {
			switch (type) {
				case "stop":
					this.stopVideo();
					this.pauseVideo(true);
					break;
				case "hardStop":
					this.hardStopVideo();
					this.pauseVideo(true);
					break;
				case "pause":
					this.pauseVideo(true);
					break;
				case "play":
					this.pauseVideo(false);
					break;
				case "skipToLast10Secs":
					this.seekTo(
						this.song.duration - 10 + this.song.skipDuration
					);
					break;
				default:
					break;
			}
		},
		play() {
			if (
				this.video.player.getVideoData().video_id !==
				this.song.youtubeId
			) {
				this.song.duration = -1;
				this.loadVideoById(this.song.youtubeId, this.song.skipDuration);
			}
			this.settings("play");
		},
		seekTo(position) {
			this.settings("play");
			this.video.player.seekTo(position);
		},
		changeVolume() {
			const volume = this.volumeSliderValue;
			localStorage.setItem("volume", volume);
			this.video.player.setVolume(volume);
			if (volume > 0) {
				this.video.player.unMute();
				this.muted = false;
			}
		},
		toggleMute() {
			const previousVolume = parseFloat(localStorage.getItem("volume"));
			const volume =
				this.video.player.getVolume() <= 0 ? previousVolume : 0;
			this.muted = !this.muted;
			this.volumeSliderValue = volume;
			this.video.player.setVolume(volume);
			if (!this.muted) localStorage.setItem("volume", volume);
		},
		increaseVolume() {
			const previousVolume = parseFloat(localStorage.getItem("volume"));
			let volume = previousVolume + 5;
			this.muted = false;
			if (volume > 100) volume = 100;
			this.volumeSliderValue = volume;
			this.video.player.setVolume(volume);
			localStorage.setItem("volume", volume);
		},
		addTag(type, value) {
			if (type === "genres") {
				const genre = value || this.genreInputValue.trim();

				if (
					this.song.genres
						.map(genre => genre.toLowerCase())
						.indexOf(genre.toLowerCase()) !== -1
				)
					return new Toast("Genre already exists");
				if (genre) {
					this.song.genres.push(genre);
					this.genreInputValue = "";
					return false;
				}

				return new Toast("Genre cannot be empty");
			}
			if (type === "artists") {
				const artist = value || this.artistInputValue;
				if (this.song.artists.indexOf(artist) !== -1)
					return new Toast("Artist already exists");
				if (artist !== "") {
					this.song.artists.push(artist);
					this.artistInputValue = "";
					return false;
				}
				return new Toast("Artist cannot be empty");
			}
			if (type === "tags") {
				const tag = value || this.tagInputValue;
				if (this.song.tags.indexOf(tag) !== -1)
					return new Toast("Tag already exists");
				if (tag !== "") {
					this.song.tags.push(tag);
					this.tagInputValue = "";
					return false;
				}
				return new Toast("Tag cannot be empty");
			}

			return false;
		},
		removeTag(type, value) {
			if (type === "genres")
				this.song.genres.splice(this.song.genres.indexOf(value), 1);
			else if (type === "artists")
				this.song.artists.splice(this.song.artists.indexOf(value), 1);
			else if (type === "tags")
				this.song.tags.splice(this.song.tags.indexOf(value), 1);
		},
		drawCanvas() {
			if (!this.songDataLoaded) return;
			const canvasElement = this.$refs.durationCanvas;
			const ctx = canvasElement.getContext("2d");

			const videoDuration = Number(this.youtubeVideoDuration);

			const skipDuration = Number(this.song.skipDuration);
			const duration = Number(this.song.duration);
			const afterDuration = videoDuration - (skipDuration + duration);

			const width = 530;

			const currentTime =
				this.video.player && this.video.player.getCurrentTime
					? this.video.player.getCurrentTime()
					: 0;

			const widthSkipDuration = (skipDuration / videoDuration) * width;
			const widthDuration = (duration / videoDuration) * width;
			const widthAfterDuration = (afterDuration / videoDuration) * width;

			const widthCurrentTime = (currentTime / videoDuration) * width;

			const skipDurationColor = "#F42003";
			const durationColor = "#03A9F4";
			const afterDurationColor = "#41E841";
			const currentDurationColor = "#3b25e8";

			ctx.fillStyle = skipDurationColor;
			ctx.fillRect(0, 0, widthSkipDuration, 20);
			ctx.fillStyle = durationColor;
			ctx.fillRect(widthSkipDuration, 0, widthDuration, 20);
			ctx.fillStyle = afterDurationColor;
			ctx.fillRect(
				widthSkipDuration + widthDuration,
				0,
				widthAfterDuration,
				20
			);

			ctx.fillStyle = currentDurationColor;
			ctx.fillRect(widthCurrentTime, 0, 1, 20);
		},
		setTrackPosition(event) {
			this.seekTo(
				Number(
					Number(this.video.player.getDuration()) *
						((event.pageX -
							event.target.getBoundingClientRect().left) /
							530)
				)
			);
		},
		toggleGenreHelper() {
			this.$refs.genreHelper.toggleBox();
		},
		resetGenreHelper() {
			this.$refs.genreHelper.resetBox();
		},
		sendActivityWatchVideoData() {
			if (!this.video.paused) {
				if (this.activityWatchVideoLastStatus !== "playing") {
					this.activityWatchVideoLastStatus = "playing";
					if (
						this.song.skipDuration > 0 &&
						parseFloat(this.youtubeVideoCurrentTime) === 0
					) {
						this.activityWatchVideoLastStartDuration = Math.floor(
							this.song.skipDuration +
								parseFloat(this.youtubeVideoCurrentTime)
						);
					} else {
						this.activityWatchVideoLastStartDuration = Math.floor(
							parseFloat(this.youtubeVideoCurrentTime)
						);
					}
				}

				const videoData = {
					title: this.song.title,
					artists: this.song.artists
						? this.song.artists.join(", ")
						: null,
					youtubeId: this.song.youtubeId,
					muted: this.muted,
					volume: this.volumeSliderValue,
					startedDuration:
						this.activityWatchVideoLastStartDuration <= 0
							? 0
							: this.activityWatchVideoLastStartDuration,
					source: `editSong#${this.song.youtubeId}`,
					hostname: window.location.hostname
				};

				aw.sendVideoData(videoData);
			} else {
				this.activityWatchVideoLastStatus = "not_playing";
			}
		},
		remove(id) {
			this.socket.dispatch("songs.remove", id, res => {
				new Toast(res.message);
			});
		},
		confirmAction(confirm) {
			this.confirm = confirm;
			this.updateConfirmMessage(confirm.message);
			this.openModal("editSongConfirm");
		},
		handleConfirmed() {
			const { action, params } = this.confirm;
			if (typeof this[action] === "function") {
				if (params) this[action](params);
				else this[action]();
			}
			this.confirm = {
				message: "",
				action: "",
				params: null
			};
		},
		onCloseModal() {
			const songStringified = JSON.stringify({
				...this.song
			});
			const originalSongStringified = JSON.stringify({
				...this.originalSong
			});
			const unsavedChanges = songStringified !== originalSongStringified;

			if (unsavedChanges) {
				return this.confirmAction({
					message:
						"You have unsaved changes. Are you sure you want to discard unsaved changes?",
					action: "closeThisModal",
					params: null
				});
			}

			return this.closeThisModal();
		},
		closeThisModal() {
			if (this.bulk) this.$emit("close");
			else this.closeModal("editSong");
		},
		...mapActions("modals/importAlbum", ["selectDiscogsAlbum"]),
		...mapActions({
			showTab(dispatch, payload) {
				if (this.$refs[`${payload}-tab`])
					this.$refs[`${payload}-tab`].scrollIntoView({
						block: "nearest"
					});
				return dispatch("modals/editSong/showTab", payload);
			}
		}),
		...mapActions("modals/editSong", [
			"stopVideo",
			"hardStopVideo",
			"loadVideoById",
			"pauseVideo",
			"getCurrentTime",
			"setSong",
			"resetSong",
			"updateOriginalSong",
			"updateSongField",
			"updateReports",
			"setPlaybackRate"
		]),
		...mapActions("modals/confirm", ["updateConfirmMessage"]),
		...mapActions("modalVisibility", ["closeModal", "openModal"])
	}
};
</script>

<style lang="less" scoped>
.night-mode {
	.edit-section,
	.player-section,
	#tabs-container {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;
		.tab {
			border: 0 !important;
		}
	}

	#tabs-container #tab-selection .button {
		background: var(--dark-grey) !important;
		color: var(--white) !important;
	}

	.left-section {
		.edit-section {
			.album-get-button,
			.duration-fill-button,
			.add-button {
				&:focus,
				&:hover {
					border: none !important;
				}
			}
		}
	}

	#durationCanvas {
		background-color: var(--dark-grey-2) !important;
	}
}

.modal-card-body {
	display: flex;
}

.notice-container {
	display: flex;
	flex: 1;
	justify-content: center;

	h4 {
		margin: auto;
	}
}

.left-section {
	flex-basis: unset !important;
	height: 100%;
	display: flex;
	flex-direction: column;
	margin-right: 16px;

	.top-section {
		display: flex;

		.player-section {
			width: 530px;
			display: flex;
			flex-direction: column;
			border: 1px solid var(--light-grey-3);
			border-radius: @border-radius;
			overflow: hidden;

			#durationCanvas {
				background-color: var(--light-grey-2);
			}

			.player-error {
				display: flex;
				height: 318px;
				width: 530px;
				align-items: center;

				* {
					margin: 0;
					flex: 1;
					font-size: 30px;
					text-align: center;
				}
			}

			.player-footer {
				display: flex;
				justify-content: space-between;
				height: 54px;
				padding-left: 10px;
				padding-right: 10px;

				> * {
					width: 33.3%;
					display: flex;
					align-items: center;
				}

				.player-footer-left {
					flex: 1;

					& > .button:not(:first-child) {
						margin-left: 5px;
					}

					:deep(& > .playerRateDropdown) {
						margin-left: 5px;
						margin-bottom: unset !important;

						.control.has-addons {
							margin-bottom: unset !important;

							& > .button {
								font-size: 24px;
							}
						}
					}

					:deep(.tippy-box[data-theme~="dropdown"]) {
						max-width: 100px !important;

						.nav-dropdown-items .nav-item {
							justify-content: center !important;
							border-radius: @border-radius !important;

							&.active {
								background-color: var(--primary-color);
								color: var(--white);
							}
						}
					}
				}

				.player-footer-center {
					justify-content: center;
					align-items: center;
					flex: 2;
					font-size: 18px;
					font-weight: 400;
					width: 200px;
					margin: 0 5px;

					img {
						height: 21px;
						margin-right: 12px;
						filter: invert(26%) sepia(54%) saturate(6317%)
							hue-rotate(2deg) brightness(92%) contrast(115%);
					}
				}

				.player-footer-right {
					justify-content: right;
					flex: 1;

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
							border-radius: @border-radius;
							border: 0;
						}

						input[type="range"]::-webkit-slider-thumb {
							box-shadow: 0;
							border: 0;
							height: 19px;
							width: 19px;
							border-radius: 100%;
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
							border-radius: @border-radius;
							border: 0;
						}

						input[type="range"]::-moz-range-thumb {
							box-shadow: 0;
							border: 0;
							height: 19px;
							width: 19px;
							border-radius: 100%;
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
							border-radius: @border-radius;
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
							border-radius: 100%;
							background: var(--primary-color);
							cursor: pointer;
							-webkit-appearance: none;
							margin-top: 1.5px;
						}
					}
				}
			}
		}

		.thumbnail-preview {
			width: 189px;
			height: 189px;
			margin-left: 16px;
		}
	}

	.edit-section {
		width: 735px;
		border: 1px solid var(--light-grey-3);
		flex: 1;
		margin-top: 16px;
		border-radius: @border-radius;

		.album-get-button {
			background-color: var(--purple);
			color: var(--white);
			width: 32px;
			text-align: center;
			border-width: 0;
		}

		.duration-fill-button {
			background-color: var(--dark-red);
			color: var(--white);
			width: 32px;
			text-align: center;
			border-width: 0;
		}

		.add-button {
			background-color: var(--primary-color) !important;
			width: 32px;

			i {
				font-size: 32px;
			}
		}

		.album-get-button,
		.duration-fill-button,
		.add-button {
			&:focus,
			&:hover {
				filter: contrast(0.75);
				border: 1px solid var(--black) !important;
			}
		}

		> div {
			margin: 16px !important;
		}

		input {
			width: 100%;
		}

		.title-container {
			width: calc((100% - 32px) / 2);
		}

		.duration-container {
			margin-right: 16px;
			margin-left: 16px;
			width: calc((100% - 32px) / 4);
		}

		.skip-duration-container {
			width: calc((100% - 32px) / 4);
		}

		.album-art-container {
			margin-right: 16px;
			width: calc((100% - 16px) / 8 * 4);
		}

		.youtube-id-container {
			margin-right: 16px;
			width: calc((100% - 16px) / 8 * 3);
		}

		.verified-container {
			width: calc((100% - 16px) / 8);

			.checkbox-control {
				margin-top: 10px;
			}
		}

		.artists-container {
			width: calc((100% - 32px) / 3);
			position: relative;
		}

		.genres-container {
			width: calc((100% - 32px) / 3);
			margin-left: 16px;
			margin-right: 16px;
			position: relative;

			label {
				display: flex;

				i {
					font-size: 15px;
					align-self: center;
					margin-left: 5px;
					color: var(--primary-color);
					cursor: pointer;
					-webkit-user-select: none;
					-moz-user-select: none;
					-ms-user-select: none;
					user-select: none;
				}
			}
		}

		.tags-container {
			width: calc((100% - 32px) / 3);
			position: relative;
		}

		.list-item-circle {
			background-color: var(--primary-color);
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

			i {
				color: var(--primary-color);
				font-size: 14px;
				margin-left: 1px;
				position: relative;
				top: -1px;
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

		.thumbnail-warning {
			color: var(--red);
			font-size: 18px;
			margin: auto 0 auto 5px;
		}
	}
}

.right-section {
	flex-basis: unset !important;
	flex-grow: 0 !important;
	display: flex;
	height: 100%;

	#tabs-container {
		width: 376px;

		#tab-selection {
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
			border-radius: 0 0 @border-radius @border-radius;
			padding: 15px;
			height: calc(100% - 32px);
			overflow: auto;
		}
	}
}

.modal-card-foot .is-primary {
	width: 200px;
}

:deep(.autosuggest-container) {
	top: unset;
}
</style>
