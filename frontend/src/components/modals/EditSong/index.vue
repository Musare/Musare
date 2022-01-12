<template>
	<div>
		<modal
			title="Edit Song"
			class="song-modal"
			:size="'wide'"
			:split="true"
		>
			<template #body>
				<div class="left-section">
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
							/>
							<div class="player-footer">
								<div class="player-footer-left">
									<button
										class="button is-primary"
										@click="play()"
										@keyup.enter="play()"
										v-if="video.paused"
										content="Unpause Playback"
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
										@click="settings('stop')"
										@keyup.enter="settings('stop')"
										content="Stop Playback"
										v-tippy
									>
										<i class="material-icons">stop</i>
									</button>

									<button
										class="button is-success"
										@click="settings('skipToLast10Secs')"
										@keyup.enter="
											settings('skipToLast10Secs')
										"
										content="Skip to last 10 secs"
										v-tippy
									>
										<i class="material-icons"
											>fast_forward</i
										>
									</button>
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
								</div>
							</div>
						</div>
						<img
							class="thumbnail-preview"
							:src="song.thumbnail"
							onerror="this.src='/assets/notes-transparent.png'"
							ref="thumbnailElement"
							v-if="songDataLoaded"
						/>
					</div>

					<div class="edit-section" v-if="songDataLoaded">
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
								<label class="label">Album art</label>

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
						</div>

						<div class="control is-grouped">
							<div class="artists-container">
								<label class="label">Artists</label>
								<p class="control has-addons">
									<input
										class="input"
										type="text"
										ref="new-artist"
										v-model="artistInputValue"
										placeholder="Add artist..."
										@blur="blurArtistInput()"
										@focus="focusArtistInput()"
										@keydown="keydownArtistInput()"
										@keyup.exact.enter="addTag('artists')"
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
								<div
									class="autosuggest-container"
									v-if="
										(artistInputFocussed ||
											artistAutosuggestContainerFocussed) &&
										artistAutosuggestItems.length > 0
									"
									@mouseover="focusArtistContainer()"
									@mouseleave="blurArtistContainer()"
								>
									<span
										class="autosuggest-item"
										tabindex="0"
										@click="addTag('artists', item)"
										v-for="item in artistAutosuggestItems"
										:key="item"
										>{{ item }}</span
									>
								</div>
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
									<input
										class="input"
										type="text"
										ref="new-genre"
										v-model="genreInputValue"
										placeholder="Add genre..."
										@blur="blurGenreInput()"
										@focus="focusGenreInput()"
										@keydown="keydownGenreInput()"
										@keyup.exact.enter="addTag('genres')"
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
										@click="addTag('genres', item)"
										v-for="item in genreAutosuggestItems"
										:key="item"
										>{{ item }}</span
									>
								</div>
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
									<input
										class="input"
										type="text"
										ref="new-tag"
										v-model="tagInputValue"
										placeholder="Add tag..."
										@keyup.exact.enter="addTag('tags')"
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
				<div class="right-section" v-if="songDataLoaded">
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
						<discogs class="tab" v-show="tab === 'discogs'" />
						<reports class="tab" v-show="tab === 'reports'" />
						<youtube class="tab" v-show="tab === 'youtube'" />
						<musare-songs
							class="tab"
							v-show="tab === 'musare-songs'"
						/>
					</div>
				</div>
			</template>
			<template #footer>
				<div>
					<save-button
						ref="saveButton"
						@clicked="save(song, false, false)"
					/>
					<save-button
						ref="saveAndCloseButton"
						default-message="Save and close"
						@clicked="save(song, false, true)"
					/>
					<save-button
						ref="saveVerifyAndCloseButton"
						default-message="Save, verify and close"
						@click="save(song, true, true)"
					/>

					<button
						class="button is-danger"
						@click="stopEditingSongs()"
						v-if="modals.importAlbum && editingSongs"
					>
						Stop editing songs
					</button>

					<div class="right">
						<button
							v-if="song.status !== 'verified'"
							class="button is-success"
							@click="verify(song._id)"
							content="Verify Song"
							v-tippy
						>
							<i class="material-icons">check_circle</i>
						</button>
						<quick-confirm
							v-if="song.status === 'verified'"
							placement="left"
							@confirm="unverify(song._id)"
						>
							<button
								class="button is-danger"
								content="Unverify Song"
								v-tippy
							>
								<i class="material-icons">cancel</i>
							</button>
						</quick-confirm>
						<quick-confirm
							v-if="song.status !== 'hidden'"
							placement="left"
							@confirm="hide(song._id)"
						>
							<button
								class="button is-danger"
								content="Hide Song"
								v-tippy
							>
								<i class="material-icons">visibility_off</i>
							</button>
						</quick-confirm>
						<button
							v-if="song.status === 'hidden'"
							class="button is-success"
							@click="unhide(song._id)"
							content="Unhide Song"
							v-tippy
						>
							<i class="material-icons">visibility</i>
						</button>
						<button
							class="
								button
								is-danger
								icon-with-button
								material-icons
							"
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
			</template>
		</modal>
		<floating-box id="genreHelper" ref="genreHelper" :column="false">
			<template #body>
				<span>Blues</span><span>Country</span><span>Disco</span
				><span>Funk</span><span>Hip-Hop</span><span>Jazz</span
				><span>Metal</span><span>Oldies</span><span>Other</span
				><span>Pop</span><span>Rap</span><span>Reggae</span
				><span>Rock</span><span>Techno</span><span>Trance</span
				><span>Classical</span><span>Instrumental</span
				><span>House</span><span>Electronic</span
				><span>Christian Rap</span><span>Lo-Fi</span><span>Musical</span
				><span>Rock 'n' Roll</span><span>Opera</span
				><span>Drum & Bass</span><span>Club-House</span
				><span>Indie</span><span>Heavy Metal</span
				><span>Christian rock</span><span>Dubstep</span>
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

import QuickConfirm from "@/components/QuickConfirm.vue";
import Modal from "../../Modal.vue";
import FloatingBox from "../../FloatingBox.vue";
import SaveButton from "../../SaveButton.vue";

import Discogs from "./Tabs/Discogs.vue";
import Reports from "./Tabs/Reports.vue";
import Youtube from "./Tabs/Youtube.vue";
import MusareSongs from "./Tabs/Songs.vue";

export default {
	components: {
		Modal,
		FloatingBox,
		SaveButton,
		QuickConfirm,
		Discogs,
		Reports,
		Youtube,
		MusareSongs,
		Confirm: defineAsyncComponent(() =>
			import("@/components/modals/Confirm.vue")
		)
	},
	props: {
		youtubeId: { type: String, default: null },
		songId: { type: String, default: null },
		discogsAlbum: { type: Object, default: null },
		sector: { type: String, default: "admin" }
	},
	data() {
		return {
			songDataLoaded: false,
			youtubeError: false,
			youtubeErrorMessage: "",
			focusedElementBefore: null,
			youtubeVideoDuration: "0.000",
			youtubeVideoCurrentTime: 0,
			youtubeVideoNote: "",
			useHTTPS: false,
			muted: false,
			volumeSliderValue: 0,
			skipToLast10SecsPressed: false,
			artistInputValue: "",
			genreInputValue: "",
			tagInputValue: "",
			artistInputFocussed: false,
			genreInputFocussed: false,
			genreAutosuggestContainerFocussed: false,
			artistAutosuggestContainerFocussed: false,
			keydownArtistInputTimeout: 0,
			keydownGenreInputTimeout: 0,
			artistAutosuggestItems: [],
			genreAutosuggestItems: [],
			activityWatchVideoDataInterval: null,
			activityWatchVideoLastStatus: "",
			activityWatchVideoLastStartDuration: "",
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
			confirm: {
				message: "",
				action: "",
				params: null
			}
		};
	},
	computed: {
		...mapState("modals/editSong", {
			tab: state => state.tab,
			video: state => state.video,
			song: state => state.song,
			originalSong: state => state.originalSong,
			reports: state => state.reports
		}),
		...mapState("modals/importAlbum", {
			editingSongs: state => state.editingSongs
		}),
		...mapState("modalVisibility", {
			modals: state => state.modals
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
		}
		/* eslint-enable */
	},
	async mounted() {
		this.activityWatchVideoDataInterval = setInterval(() => {
			this.sendActivityWatchVideoData();
		}, 1000);

		this.useHTTPS = await lofig.get("cookie.secure");

		ws.onConnect(this.init);

		let volume = parseFloat(localStorage.getItem("volume"));
		volume =
			typeof volume === "number" && !Number.isNaN(volume) ? volume : 20;
		localStorage.setItem("volume", volume);
		this.volumeSliderValue = volume * 100;

		this.socket.on(
			"event:admin.song.updated",
			res => {
				if (res.data.song._id === this.song._id)
					this.song.status = res.data.song.status;
			},
			{ modal: "editSong" }
		);

		this.socket.on(
			"event:admin.song.removed",
			res => {
				if (res.data.songId === this.song._id) {
					this.closeModal("editSong");
					setTimeout(() => {
						window.focusedElementBefore.focus();
					}, 500);
				}
			},
			{ modal: "editSong" }
		);

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
					this.volumeSliderValue - 1000
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
					this.volumeSliderValue - 100
				);
				this.changeVolume();
			}
		});

		keyboardShortcuts.registerShortcut("editSong.increaseVolumeLarge", {
			keyCode: 104,
			preventDefault: true,
			handler: () => {
				this.volumeSliderValue = Math.min(
					10000,
					this.volumeSliderValue + 1000
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
					10000,
					this.volumeSliderValue + 100
				);
				this.changeVolume();
			}
		});

		keyboardShortcuts.registerShortcut("editSong.save", {
			keyCode: 83,
			ctrl: true,
			preventDefault: true,
			handler: () => {
				this.save(this.song, false, false);
			}
		});

		keyboardShortcuts.registerShortcut("editSong.saveClose", {
			keyCode: 83,
			ctrl: true,
			alt: true,
			preventDefault: true,
			handler: () => {
				this.save(this.song, true);
			}
		});

		// TODO
		keyboardShortcuts.registerShortcut("editSong.saveVerifyClose", {
			keyCode: 86,
			ctrl: true,
			alt: true,
			preventDefault: true,
			handler: () => {
				// alert("not implemented yet");
			}
		});

		keyboardShortcuts.registerShortcut("editSong.close", {
			keyCode: 115,
			preventDefault: true,
			handler: () => {
				this.closeModal("editSong");
				setTimeout(() => {
					window.focusedElementBefore.focus();
				}, 500);
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

		/*
		
		editSong.pauseResume - Num 5 - Pause/resume song
		editSong.stopVideo - Ctrl - Num 5 - Stop
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
		this.video.player.stopVideo();
		this.playerReady = false;
		clearInterval(this.interval);
		clearInterval(this.activityWatchVideoDataInterval);

		this.socket.dispatch("apis.leaveRoom", `edit-song.${this.song._id}`);

		const shortcutNames = [
			"editSong.pauseResume",
			"editSong.stopVideo",
			"editSong.skipToLast10Secs",
			"editSong.lowerVolumeLarge",
			"editSong.lowerVolumeSmall",
			"editSong.increaseVolumeLarge",
			"editSong.increaseVolumeSmall",
			"editSong.focusTitle",
			"editSong.focusDicogs",
			"editSong.save",
			"editSong.saveClose",
			"editSong.saveVerifyClose",
			"editSong.close",
			"editSong.useAllDiscogs"
		];

		shortcutNames.forEach(shortcutName => {
			keyboardShortcuts.unregisterShortcut(shortcutName);
		});
	},
	methods: {
		init() {
			this.socket.dispatch(
				`songs.getSongFromSongId`,
				this.song._id,
				res => {
					if (res.status === "success") {
						let { song } = res.data;

						if (this.song.prefill)
							song = Object.assign(song, this.song.prefill);

						if (this.song.discogs)
							song = {
								...song,
								discogs: this.song.discogs
							};

						this.editSong(song);

						this.songDataLoaded = true;

						this.socket.dispatch(
							"apis.joinRoom",
							`edit-song.${this.song._id}`
						);

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
								this.video.paused = true;
								this.video.player.stopVideo();
								this.drawCanvas();
							}
							if (this.playerReady) {
								this.youtubeVideoCurrentTime = this.video.player
									.getCurrentTime()
									.toFixed(3);
							}

							if (this.video.paused === false) this.drawCanvas();
						}, 200);

						if (window.YT && window.YT.Player) {
							this.video.player = new window.YT.Player(
								"editSongPlayer",
								{
									height: 298,
									width: 530,
									videoId: this.song.youtubeId,
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
											let volume = parseInt(
												localStorage.getItem("volume")
											);
											volume =
												typeof volume === "number"
													? volume
													: 20;
											this.video.player.setVolume(volume);
											if (volume > 0)
												this.video.player.unMute();

											const duration =
												this.video.player.getDuration();

											this.youtubeVideoDuration =
												duration.toFixed(3);
											this.youtubeVideoNote = "(~)";
											this.playerReady = true;

											this.drawCanvas();
										},
										onStateChange: event => {
											this.drawCanvas();

											let skipToLast10SecsPressed = false;
											if (
												event.data === 1 &&
												this.skipToLast10SecsPressed
											) {
												this.skipToLast10SecsPressed = false;
												skipToLast10SecsPressed = true;
											}

											if (
												event.data === 1 &&
												!skipToLast10SecsPressed
											) {
												this.video.paused = false;
												let youtubeDuration =
													this.video.player.getDuration();
												const newYoutubeVideoDuration =
													youtubeDuration.toFixed(3);

												const songDurationNumber =
													Number(this.song.duration);
												const songDurationNumber2 =
													Number(this.song.duration) +
													1;
												const songDurationNumber3 =
													Number(this.song.duration) -
													1;
												const fixedSongDuration =
													songDurationNumber.toFixed(
														3
													);
												const fixedSongDuration2 =
													songDurationNumber2.toFixed(
														3
													);
												const fixedSongDuration3 =
													songDurationNumber3.toFixed(
														3
													);

												if (
													this
														.youtubeVideoDuration !==
														newYoutubeVideoDuration &&
													(fixedSongDuration ===
														this
															.youtubeVideoDuration ||
														fixedSongDuration2 ===
															this
																.youtubeVideoDuration ||
														fixedSongDuration3 ===
															this
																.youtubeVideoDuration)
												)
													this.song.duration =
														newYoutubeVideoDuration;

												this.youtubeVideoDuration =
													newYoutubeVideoDuration;
												this.youtubeVideoNote = "";

												if (this.song.duration === -1)
													this.song.duration =
														youtubeDuration;

												youtubeDuration -=
													this.song.skipDuration;
												if (
													this.song.duration >
													youtubeDuration + 1
												) {
													this.video.player.stopVideo();
													this.video.paused = true;
													return new Toast(
														"Video can't play. Specified duration is bigger than the YouTube song duration."
													);
												}
												if (this.song.duration <= 0) {
													this.video.player.stopVideo();
													this.video.paused = true;
													return new Toast(
														"Video can't play. Specified duration has to be more than 0 seconds."
													);
												}

												if (
													this.video.player.getCurrentTime() <
													this.song.skipDuration
												) {
													return this.video.player.seekTo(
														this.song.skipDuration
													);
												}
											} else if (event.data === 2) {
												this.video.paused = true;
											}

											return false;
										}
									}
								}
							);
						} else {
							this.youtubeError = true;
							this.youtubeErrorMessage =
								"Player could not be loaded.";
						}
					} else {
						new Toast("Song with that ID not found");
						this.closeModal("editSong");
					}
				}
			);

			this.socket.dispatch(
				"reports.getReportsForSong",
				this.song._id,
				res => {
					this.updateReports(res.data.reports);
				}
			);
		},
		stopEditingSongs() {
			this.updateEditingSongs(false);
			this.closeModal("editSong");
		},
		importAlbum(result) {
			this.selectDiscogsAlbum(result);
			this.openModal("importAlbum");
			this.closeModal("editSong");
		},
		save(songToCopy, verify, close) {
			const song = JSON.parse(JSON.stringify(songToCopy));

			let saveButtonRef = this.$refs.saveButton;
			if (close && !verify) saveButtonRef = this.$refs.saveAndCloseButton;
			else if (close && verify)
				saveButtonRef = this.$refs.saveVerifyAndCloseButton;

			if (!this.youtubeError && this.youtubeVideoDuration === "0.000") {
				saveButtonRef.handleFailedSave();
				return new Toast("The video appears to not be working.");
			}

			if (!song.title) {
				saveButtonRef.handleFailedSave();
				return new Toast("Please fill in all fields");
			}

			if (!song.thumbnail) {
				saveButtonRef.handleFailedSave();
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
				this.youtubeError &&
				this.originalSong.youtubeId !== song.youtubeId
			) {
				saveButtonRef.handleFailedSave();
				return new Toast(
					"You're not allowed to change the YouTube id while the player is not working"
				);
			}

			// Duration
			if (
				Number(song.skipDuration) + Number(song.duration) >
					this.youtubeVideoDuration &&
				(!this.youtubeError ||
					this.originalSong.duration !== song.duration)
			) {
				saveButtonRef.handleFailedSave();
				return new Toast(
					"Duration can't be higher than the length of the video"
				);
			}

			// Title
			if (!validation.isLength(song.title, 1, 100)) {
				saveButtonRef.handleFailedSave();
				return new Toast(
					"Title must have between 1 and 100 characters."
				);
			}

			// Artists
			if (song.artists.length < 1 || song.artists.length > 10) {
				saveButtonRef.handleFailedSave();
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

			if (song.genres.length < 1 || song.genres.length > 16)
				error = "You must have between 1 and 16 genres.";

			if (error) {
				saveButtonRef.handleFailedSave();
				return new Toast(error);
			}

			error = undefined;
			song.tags.forEach(tag => {
				if (
					!new RegExp(
						/^[a-zA-Z0-9_]{1,64}$|^[a-zA-Z0-9_]{1,64}\[[a-zA-Z0-9_]{1,64}\]$/
					).test(tag)
				) {
					error = "Invalid tag format.";
					return error;
				}

				return false;
			});

			if (error) {
				saveButtonRef.handleFailedSave();
				return new Toast(error);
			}

			// Thumbnail
			if (!validation.isLength(song.thumbnail, 1, 256)) {
				saveButtonRef.handleFailedSave();
				return new Toast(
					"Thumbnail must have between 8 and 256 characters."
				);
			}
			if (this.useHTTPS && song.thumbnail.indexOf("https://") !== 0) {
				saveButtonRef.handleFailedSave();
				return new Toast('Thumbnail must start with "https://".');
			}

			if (
				!this.useHTTPS &&
				song.thumbnail.indexOf("http://") !== 0 &&
				song.thumbnail.indexOf("https://") !== 0
			) {
				saveButtonRef.handleFailedSave();
				return new Toast('Thumbnail must start with "http://".');
			}

			saveButtonRef.status = "disabled";

			return this.socket.dispatch(`songs.update`, song._id, song, res => {
				new Toast(res.message);

				if (res.status === "success")
					saveButtonRef.handleSuccessfulSave();
				else saveButtonRef.handleFailedSave();

				if (verify) this.verify(this.song._id);
				if (close) this.closeModal("editSong");
			});
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
		blurArtistInput() {
			this.artistInputFocussed = false;
		},
		focusArtistInput() {
			this.artistInputFocussed = true;
		},
		blurArtistContainer() {
			this.artistAutosuggestContainerFocussed = false;
		},
		focusArtistContainer() {
			this.artistAutosuggestContainerFocussed = true;
		},
		keydownArtistInput() {
			clearTimeout(this.keydownArtistInputTimeout);
			this.keydownArtistInputTimeout = setTimeout(() => {
				// Do things here to query the artist
			}, 1000);
		},
		blurGenreInput() {
			this.genreInputFocussed = false;
		},
		focusGenreInput() {
			this.genreInputFocussed = true;
		},
		blurGenreContainer() {
			this.genreAutosuggestContainerFocussed = false;
		},
		focusGenreContainer() {
			this.genreAutosuggestContainerFocussed = true;
		},
		keydownGenreInput() {
			clearTimeout(this.keydownGenreInputTimeout);
			this.keydownGenreInputTimeout = setTimeout(() => {
				if (this.genreInputValue.length > 1) {
					this.genreAutosuggestItems = this.genres.filter(genre =>
						genre
							.toLowerCase()
							.startsWith(this.genreInputValue.toLowerCase())
					);
				} else this.genreAutosuggestItems = [];
			}, 1000);
		},
		settings(type) {
			switch (type) {
				default:
					break;
				case "stop":
					this.stopVideo();
					this.pauseVideo(true);
					break;
				case "pause":
					this.pauseVideo(true);
					break;
				case "play":
					this.pauseVideo(false);
					break;
				case "skipToLast10Secs":
					this.skipToLast10SecsPressed = true;
					if (this.video.paused) this.pauseVideo(false);
					this.video.player.seekTo(
						this.song.duration - 10 + this.song.skipDuration
					);
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
		changeVolume() {
			const volume = this.volumeSliderValue;
			localStorage.setItem("volume", volume / 100);
			this.video.player.setVolume(volume / 100);
			if (volume > 0) {
				this.video.player.unMute();
				this.muted = false;
			}
		},
		toggleMute() {
			const previousVolume = parseFloat(localStorage.getItem("volume"));
			const volume =
				this.video.player.getVolume() * 100 <= 0 ? previousVolume : 0;
			this.muted = !this.muted;
			this.volumeSliderValue = volume * 100;
			this.video.player.setVolume(volume);
			if (!this.muted) localStorage.setItem("volume", volume);
		},
		increaseVolume() {
			const previousVolume = parseInt(localStorage.getItem("volume"));
			let volume = previousVolume + 5;
			this.muted = false;
			if (volume > 100) volume = 100;
			this.volumeSliderValue = volume * 100;
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
					this.genreAutosuggestItems = [];
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
					this.artistAutosuggestItems = [];
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
					volume: this.volumeSliderValue / 100,
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
		verify(id) {
			this.socket.dispatch("songs.verify", id, res => {
				new Toast(res.message);
			});
		},
		unverify(id) {
			this.socket.dispatch("songs.unverify", id, res => {
				new Toast(res.message);
			});
		},
		hide(id) {
			this.socket.dispatch("songs.hide", id, res => {
				new Toast(res.message);
			});
		},
		unhide(id) {
			this.socket.dispatch("songs.unhide", id, res => {
				new Toast(res.message);
			});
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
		...mapActions("modals/importAlbum", [
			"selectDiscogsAlbum",
			"updateEditingSongs"
		]),
		...mapActions({
			showTab(dispatch, payload) {
				this.$refs[`${payload}-tab`].scrollIntoView({
					block: "nearest"
				});
				return dispatch("modals/editSong/showTab", payload);
			}
		}),
		...mapActions("modals/editSong", [
			"stopVideo",
			"loadVideoById",
			"pauseVideo",
			"getCurrentTime",
			"editSong",
			"updateSongField",
			"updateReports"
		]),
		...mapActions("modals/confirm", ["updateConfirmMessage"]),
		...mapActions("modalVisibility", ["closeModal", "openModal"])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.edit-section,
	.player-footer,
	#tabs-container {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;
		.tab {
			border: 0 !important;
		}
	}

	.autosuggest-container {
		background-color: unset !important;
	}

	.autosuggest-item {
		background-color: var(--dark-grey) !important;
		color: var(--white) !important;
		border-color: var(--dark-grey) !important;
	}

	.autosuggest-item:hover,
	.autosuggest-item:focus {
		background-color: var(--dark-grey-2) !important;
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
}

.modal-card-body {
	display: flex;
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

			.player-error {
				height: 318px;
				width: 530px;
				display: block;
				border: 1px rgba(163, 224, 255, 0.75) solid;
				border-radius: 5px 5px 0px 0px;
				display: flex;
				align-items: center;

				* {
					margin: 0;
					flex: 1;
					font-size: 30px;
					text-align: center;
				}
			}

			.player-footer {
				border: 1px solid var(--light-grey-3);
				border-radius: 0px 0px 3px 3px;
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

					.button {
						width: 75px;

						&:not(:first-of-type) {
							margin-left: 5px;
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
		border-radius: 3px;

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
			width: calc((100% - 16px) / 3 * 2);
		}

		.youtube-id-container {
			width: calc((100% - 16px) / 3);
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
			border-radius: 0 0 5px 5px;
			padding: 15px;
			height: calc(100% - 32px);
			overflow: auto;
		}
	}
}

.modal-card-foot .is-primary {
	width: 200px;
}
</style>
