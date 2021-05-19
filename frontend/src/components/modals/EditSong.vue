<template>
	<div>
		<modal title="Edit Song" class="song-modal">
			<div slot="body">
				<div class="left-section">
					<div class="top-section">
						<div class="player-section">
							<div id="editSongPlayer"></div>
							<canvas
								ref="durationCanvas"
								height="20"
								width="530"
							></canvas>
							<div class="player-footer">
								<div class="player-footer-left">
									<i
										class="material-icons player-play-pause"
										@click="play()"
										@keyup.enter="play()"
										tabindex="0"
										v-if="video.paused"
										>play_arrow</i
									>
									<i
										class="material-icons player-play-pause"
										@click="settings('pause')"
										@keyup.enter="settings('pause')"
										tabindex="0"
										v-if="!video.paused"
										>pause</i
									>
									<i
										class="material-icons player-stop"
										@click="settings('stop')"
										@keyup.enter="settings('stop')"
										tabindex="0"
										>stop</i
									>
									<i
										class="material-icons player-fast-forward"
										@click="settings('skipToLast10Secs')"
										@keyup.enter="
											settings('skipToLast10Secs')
										"
										tabindex="0"
										>fast_forward</i
									>
								</div>
								<div class="player-footer-center">
									<img src="/assets/social/youtube.svg" />
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
									<input
										type="range"
										v-model="volumeSliderValue"
										min="0"
										max="10000"
										class="active"
										@change="changeVolume()"
										@input="changeVolume()"
									/>
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
										@keyup.ctrl.alt.d="
											getAlbumData('title')
										"
									/>
									<button
										class="button album-get-button"
										@click="getAlbumData('title')"
									>
										<i class="material-icons">album</i>
									</button>
								</p>
							</div>
							<div class="duration-container">
								<label class="label">Duration</label>
								<p class="control has-addons">
									<input
										class="input"
										type="text"
										v-model.number="song.duration"
									/>
									<button
										class="button duration-fill-button"
										@click="fillDuration()"
									>
										<i class="material-icons">sync</i>
									</button>
								</p>
							</div>
							<div class="skip-duration-container">
								<label class="label">Skip duration</label>
								<p class="control">
									<input
										class="input"
										type="text"
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
										@keyup.ctrl.alt.d="
											getAlbumData('albumArt')
										"
									/>
									<button
										class="button album-get-button"
										@click="getAlbumData('albumArt')"
									>
										<i class="material-icons">album</i>
									</button>
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
										@blur="blurArtistInput()"
										@focus="focusArtistInput()"
										@keydown="keydownArtistInput()"
										@keyup.enter="addTag('artists')"
										@keyup.ctrl.alt.d="
											getAlbumData('artists')
										"
									/>
									<button
										class="button album-get-button"
										@click="getAlbumData('artists')"
									>
										<i class="material-icons">album</i>
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
										@click="selectArtistAutosuggest(item)"
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
										>info</i
									>
								</label>
								<p class="control has-addons">
									<input
										class="input"
										type="text"
										ref="new-genre"
										v-model="genreInputValue"
										@blur="blurGenreInput()"
										@focus="focusGenreInput()"
										@keydown="keydownGenreInput()"
										@keyup.enter="addTag('genres')"
										@keyup.ctrl.alt.d="
											getAlbumData('genres')
										"
									/>
									<button
										class="button album-get-button"
										@click="getAlbumData('genres')"
									>
										<i class="material-icons">album</i>
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
										@click="selectGenreAutosuggest(item)"
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
							<div class="youtube-id-container">
								<label class="label">YouTube ID</label>
								<p class="control">
									<input
										class="input"
										type="text"
										v-model="song.youtubeId"
									/>
								</p>
							</div>
						</div>
					</div>
				</div>
				<div class="right-section" v-if="songDataLoaded">
					<div class="api-section">
						<div class="selected-discogs-info" v-if="!song.discogs">
							<p class="selected-discogs-info-none">None</p>
						</div>
						<div class="selected-discogs-info" v-if="song.discogs">
							<div class="top-container">
								<img :src="song.discogs.album.albumArt" />
								<div class="right-container">
									<p class="album-title">
										{{ song.discogs.album.title }}
									</p>
									<div class="bottom-row">
										<p class="type-year">
											<span>{{
												song.discogs.album.type
											}}</span>
											•
											<span>{{
												song.discogs.album.year
											}}</span>
										</p>
									</div>
								</div>
							</div>
							<div class="bottom-container">
								<p class="bottom-container-field">
									Artists:
									<span>{{
										song.discogs.album.artists.join(", ")
									}}</span>
								</p>
								<p class="bottom-container-field">
									Genres:
									<span>{{
										song.discogs.album.genres.join(", ")
									}}</span>
								</p>
								<p class="bottom-container-field">
									Data quality:
									<span>{{ song.discogs.dataQuality }}</span>
								</p>
								<p class="bottom-container-field">
									Track:
									<span
										>{{ song.discogs.track.position }}.
										{{ song.discogs.track.title }}</span
									>
								</p>
							</div>
						</div>
						<p class="control is-expanded">
							<label class="label">Search query</label>
							<input
								class="input"
								type="text"
								ref="discogs-input"
								v-model="discogsQuery"
								@keyup.enter="searchDiscogsForPage(1)"
								@change="onDiscogsQueryChange"
								v-focus
							/>
						</p>
						<button
							class="button is-info is-fullwidth"
							@click="searchDiscogsForPage(1)"
						>
							Search
						</button>
						<label
							class="label"
							v-if="discogs.apiResults.length > 0"
							>API results</label
						>
						<div
							class="api-results-container"
							v-if="discogs.apiResults.length > 0"
						>
							<div
								class="api-result"
								v-for="(result, index) in discogs.apiResults"
								:key="result.album.id"
								tabindex="0"
								@keydown.space.prevent
								@keyup.enter="toggleAPIResult(index)"
							>
								<div class="top-container">
									<img :src="result.album.albumArt" />
									<div class="right-container">
										<p class="album-title">
											{{ result.album.title }}
										</p>
										<div class="bottom-row">
											<img
												src="/assets/arrow_up.svg"
												v-if="result.expanded"
												@click="toggleAPIResult(index)"
											/>
											<img
												src="/assets/arrow_down.svg"
												v-if="!result.expanded"
												@click="toggleAPIResult(index)"
											/>
											<p class="type-year">
												<span>{{
													result.album.type
												}}</span>
												•
												<span>{{
													result.album.year
												}}</span>
											</p>
										</div>
									</div>
								</div>
								<div
									class="bottom-container"
									v-if="result.expanded"
								>
									<p class="bottom-container-field">
										Artists:
										<span>{{
											result.album.artists.join(", ")
										}}</span>
									</p>
									<p class="bottom-container-field">
										Genres:
										<span>{{
											result.album.genres.join(", ")
										}}</span>
									</p>
									<p class="bottom-container-field">
										Data quality:
										<span>{{ result.dataQuality }}</span>
									</p>
									<div class="tracks">
										<div
											class="track"
											tabindex="0"
											v-for="(track,
											trackIndex) in result.tracks"
											:key="
												`${track.position}-${track.title}`
											"
											@click="
												selectTrack(index, trackIndex)
											"
											@keyup.enter="
												selectTrack(index, trackIndex)
											"
										>
											<span>{{ track.position }}.</span>
											<p>{{ track.title }}</p>
										</div>
									</div>
								</div>
							</div>
						</div>
						<button
							v-if="
								discogs.apiResults.length > 0 &&
									!discogs.disableLoadMore &&
									discogs.page < discogs.pages
							"
							class="button is-fullwidth is-info discogs-load-more"
							@click="loadNextDiscogsPage()"
						>
							Load more...
						</button>
					</div>
				</div>
			</div>
			<div slot="footer">
				<save-button
					ref="saveButton"
					@clicked="save(song, false, false)"
				/>
				<save-button
					ref="saveAndCloseButton"
					type="save-and-close"
					@clicked="save(song, false, true)"
				/>
				<button
					class="button is-primary"
					@click="save(song, true, true)"
				>
					Save, verify and close
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
					<confirm
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
					</confirm>
					<confirm
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
					</confirm>
					<button
						v-if="song.status === 'hidden'"
						class="button is-success"
						@click="unhide(song._id)"
						content="Unhide Song"
						v-tippy
					>
						<i class="material-icons">visibility</i>
					</button>
					<!-- <confirm placement="left" @confirm="remove(song._id)">
						<button
							class="button is-danger"
							content="Remove Song"
							v-tippy
						>
							<i class="material-icons">delete</i>
						</button>
					</confirm> -->
				</div>
			</div>
		</modal>
		<floating-box id="genreHelper" ref="genreHelper">
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
	</div>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";
import Toast from "toasters";

import aw from "@/aw";
import validation from "@/validation";
import keyboardShortcuts from "@/keyboardShortcuts";
import Confirm from "@/components/Confirm.vue";
import Modal from "../Modal.vue";
import FloatingBox from "../FloatingBox.vue";
import SaveButton from "../SaveButton.vue";

export default {
	components: { Modal, FloatingBox, SaveButton, Confirm },
	props: {
		youtubeId: { type: String, default: null },
		songId: { type: String, default: null },
		discogsAlbum: { type: Object, default: null },
		// songType: { type: String, default: null },
		sector: { type: String, default: "admin" }
	},
	data() {
		return {
			songDataLoaded: false,
			focusedElementBefore: null,
			discogsQuery: "",
			youtubeVideoDuration: "0.000",
			youtubeVideoCurrentTime: 0,
			youtubeVideoNote: "",
			useHTTPS: false,
			discogs: {
				apiResults: [],
				page: 1,
				pages: 1,
				disableLoadMore: false
			},
			volumeSliderValue: 0,
			skipToLast10SecsPressed: false,
			artistInputValue: "",
			genreInputValue: "",
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
			]
		};
	},
	computed: {
		...mapState("modals/editSong", {
			video: state => state.video,
			song: state => state.song
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
		"song.duration": function() {
			this.drawCanvas();
		},
		"song.skipDuration": function() {
			this.drawCanvas();
		}
		/* eslint-enable */
	},
	async mounted() {
		// if (this.modals.editSong = false) this.video.player.stopVideo();

		// this.loadVideoById(
		//   this.song.youtubeId,
		//   this.song.skipDuration
		// );

		this.activityWatchVideoDataInterval = setInterval(() => {
			this.sendActivityWatchVideoData();
		}, 1000);

		this.useHTTPS = await lofig.get("cookie.secure");

		this.socket.dispatch(`songs.getSongFromSongId`, this.song._id, res => {
			if (res.status === "success") {
				const { song } = res.data;
				// this.song = { ...song };
				// if (this.song.discogs === undefined)
				// 	this.song.discogs = null;
				if (this.song.discogs)
					this.editSong({ ...song, discogs: this.song.discogs });
				else this.editSong(song);

				console.log(song);

				this.songDataLoaded = true;

				this.socket.dispatch(
					"apis.joinRoom",
					`edit-song.${this.song._id}`
				);

				// this.edit(res.data.song);

				this.discogsQuery = this.song.title;

				this.interval = setInterval(() => {
					if (
						this.song.duration !== -1 &&
						this.video.paused === false &&
						this.playerReady &&
						this.video.player.getCurrentTime() -
							this.song.skipDuration >
							this.song.duration
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

				this.video.player = new window.YT.Player("editSongPlayer", {
					height: 298,
					width: 530,
					videoId: this.song.youtubeId,
					host: "https://www.youtube-nocookie.com",
					playerVars: {
						controls: 0,
						iv_load_policy: 3,
						rel: 0,
						showinfo: 0,
						autoplay: 1
					},
					startSeconds: this.song.skipDuration,
					events: {
						onReady: () => {
							let volume = parseInt(
								localStorage.getItem("volume")
							);
							volume = typeof volume === "number" ? volume : 20;
							this.video.player.seekTo(this.song.skipDuration);
							this.video.player.setVolume(volume);
							if (volume > 0) this.video.player.unMute();

							const duration = this.video.player.getDuration();

							this.youtubeVideoDuration = duration.toFixed(3);
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

							if (event.data === 1 && !skipToLast10SecsPressed) {
								if (!this.video.autoPlayed) {
									this.video.autoPlayed = true;
									return this.video.player.stopVideo();
								}

								this.video.paused = false;
								let youtubeDuration = this.video.player.getDuration();
								const newYoutubeVideoDuration = youtubeDuration.toFixed(
									3
								);

								const songDurationNumber = Number(
									this.song.duration
								);
								const songDurationNumber2 =
									Number(this.song.duration) + 1;
								const songDurationNumber3 =
									Number(this.song.duration) - 1;
								const fixedSongDuration = songDurationNumber.toFixed(
									3
								);
								const fixedSongDuration2 = songDurationNumber2.toFixed(
									3
								);
								const fixedSongDuration3 = songDurationNumber3.toFixed(
									3
								);

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
									this.song.duration = newYoutubeVideoDuration;

								this.youtubeVideoDuration = newYoutubeVideoDuration;
								this.youtubeVideoNote = "";

								if (this.song.duration === -1)
									this.song.duration = youtubeDuration;

								youtubeDuration -= this.song.skipDuration;
								if (this.song.duration > youtubeDuration + 1) {
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
				});
			} else {
				new Toast("Song with that ID not found");
				this.closeModal("editSong");
			}
		});

		let volume = parseFloat(localStorage.getItem("volume"));
		volume =
			typeof volume === "number" && !Number.isNaN(volume) ? volume : 20;
		localStorage.setItem("volume", volume);
		this.volumeSliderValue = volume * 100;

		this.socket.on(
			"event:admin.hiddenSong.created",
			res => {
				this.song.status = res.data.song.status;
			},
			{ modal: "editSong" }
		);

		this.socket.on(
			"event:admin.unverifiedSong.created",
			res => {
				this.song.status = res.data.song.status;
			},
			{ modal: "editSong" }
		);

		this.socket.on(
			"event:admin.verifiedSong.created",
			res => {
				this.song.status = res.data.song.status;
			},
			{ modal: "editSong" }
		);

		this.socket.on(
			"event:admin.hiddenSong.deleted",
			() => {
				new Toast("The song you were editing was removed");
				this.closeModal("editSong");
			},
			{ modal: "editSong" }
		);

		this.socket.on(
			"event:admin.unverifiedSong.deleted",
			() => {
				new Toast("The song you were editing was removed");
				this.closeModal("editSong");
			},
			{ modal: "editSong" }
		);

		this.socket.on(
			"event:admin.verifiedSong.deleted",
			() => {
				new Toast("The song you were editing was removed");
				this.closeModal("editSong");
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

		keyboardShortcuts.registerShortcut("editSong.close", {
			keyCode: 88,
			ctrl: true,
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

		keyboardShortcuts.registerShortcut("editSong.focusDiscogs", {
			keyCode: 35,
			preventDefault: true,
			handler: () => {
				this.$refs["discogs-input"].focus();
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

		keyboardShortcuts.registerShortcut("editSong.resetDuration", {
			keyCode: 82,
			alt: true,
			ctrl: true,
			preventDefault: true,
			handler: () => {
				this.fillDuration();
			}
		});

		/*
		
		editSong.pauseResume - Num 5 - Pause/resume song
		editSong.stopVideo - Ctrl - Num 5 - Stop
		editSong.skipToLast10Secs - Num 6 - Skip to last 10 seconds

		editSong.volumeDown5 - Num 2 - Volume down by 10
		editSong.volumeDown1 - Ctrl - Num 2 - Volume down by 1
		editSong.volumeUp5 - Num 8 - Volume up by 10
		editSong.volumeUp1 - Ctrl - Num 8 - Volume up by 1

		editSong.focusTitle - Home - Focus the title input
		editSong.focusDicogs - End - Focus the discogs input

		editSong.save - Ctrl - S - Saves song
		editSong.close - Ctrl - X - Closes modal

		editSong.useAllDiscogs - Ctrl - Alt - D - Sets all fields to the Discogs data
		editSong.resetDuration - Ctrl - Alt - R - Resets the duration

		Inside Discogs inputs: Ctrl - D - Sets this field to the Discogs data

		*/
	},
	beforeDestroy() {
		this.playerReady = false;
		clearInterval(this.interval);
		clearInterval(this.activityWatchVideoDataInterval);

		this.socket.dispatch(
			"apis.leaveRoom",
			`edit-song.${this.song._id}`,
			() => {}
		);

		const shortcutNames = [
			"editSong.pauseResume",
			"editSong.stopVideo",
			"editSong.skipToLast10Secs",
			"editSong.volumeDown5",
			"editSong.volumeDown1",
			"editSong.volumeUp5",
			"editSong.volumeUp1",
			"editSong.focusTitle",
			"editSong.focusDicogs",
			"editSong.save",
			"editSong.close",
			"editSong.useAllDiscogs",
			"editSong.resetDuration"
		];

		shortcutNames.forEach(shortcutName => {
			keyboardShortcuts.unregisterShortcut(shortcutName);
		});
	},
	methods: {
		save(songToCopy, verify, close) {
			const song = JSON.parse(JSON.stringify(songToCopy));

			let saveButtonRef = this.$refs.saveButton;
			if (close) saveButtonRef = this.$refs.saveAndCloseButton;

			if (this.youtubeVideoDuration === "0.000") {
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

			const thumbnailHeight = this.$refs.thumbnailElement.naturalHeight;
			const thumbnailWidth = this.$refs.thumbnailElement.naturalWidth;

			if (thumbnailHeight < 80 || thumbnailWidth < 80) {
				saveButtonRef.handleFailedSave();
				return new Toast(
					"Thumbnail width and height must be at least 80px."
				);
			}

			if (thumbnailHeight > 4000 || thumbnailWidth > 4000) {
				saveButtonRef.handleFailedSave();
				return new Toast(
					"Thumbnail width and height must be less than 4000px."
				);
			}

			if (thumbnailHeight - thumbnailWidth > 5) {
				saveButtonRef.handleFailedSave();
				return new Toast("Thumbnail cannot be taller than it is wide.");
			}

			// Duration
			if (
				Number(song.skipDuration) + Number(song.duration) >
				this.youtubeVideoDuration
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
		toggleAPIResult(index) {
			const apiResult = this.discogs.apiResults[index];
			if (apiResult.expanded === true) apiResult.expanded = false;
			else if (apiResult.gotMoreInfo === true) apiResult.expanded = true;
			else {
				fetch(apiResult.album.resourceUrl)
					.then(response => {
						return response.json();
					})
					.then(data => {
						apiResult.album.artists = [];
						apiResult.album.artistIds = [];
						const artistRegex = new RegExp(" \\([0-9]+\\)$");

						apiResult.dataQuality = data.data_quality;
						data.artists.forEach(artist => {
							apiResult.album.artists.push(
								artist.name.replace(artistRegex, "")
							);
							apiResult.album.artistIds.push(artist.id);
						});
						apiResult.tracks = data.tracklist.map(track => {
							return {
								position: track.position,
								title: track.title
							};
						});
						apiResult.expanded = true;
						apiResult.gotMoreInfo = true;
					});
			}
		},
		fillDuration() {
			this.song.duration =
				this.youtubeVideoDuration - this.song.skipDuration;
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
		searchDiscogsForPage(page) {
			const query = this.discogsQuery;

			this.socket.dispatch("apis.searchDiscogs", query, page, res => {
				if (res.status === "success") {
					if (page === 1)
						new Toast(
							`Successfully searched. Got ${res.data.results.length} results.`
						);
					else
						new Toast(
							`Successfully got ${res.data.results.length} more results.`
						);

					if (page === 1) {
						this.discogs.apiResults = [];
					}

					this.discogs.pages = res.data.pages;

					this.discogs.apiResults = this.discogs.apiResults.concat(
						res.data.results.map(result => {
							const type =
								result.type.charAt(0).toUpperCase() +
								result.type.slice(1);

							return {
								expanded: false,
								gotMoreInfo: false,
								album: {
									id: result.id,
									title: result.title,
									type,
									year: result.year,
									genres: result.genre,
									albumArt: result.cover_image,
									resourceUrl: result.resource_url
								}
							};
						})
					);

					this.discogs.page = page;
					this.discogs.disableLoadMore = false;
				} else new Toast(res.message);
			});
		},
		loadNextDiscogsPage() {
			this.discogs.disableLoadMore = true;
			this.searchDiscogsForPage(this.discogs.page + 1);
		},
		onDiscogsQueryChange() {
			this.discogs.page = 1;
			this.discogs.pages = 1;
			this.discogs.apiResults = [];
			this.discogs.disableLoadMore = false;
		},
		selectTrack(apiResultIndex, trackIndex) {
			const apiResult = JSON.parse(
				JSON.stringify(this.discogs.apiResults[apiResultIndex])
			);
			apiResult.track = apiResult.tracks[trackIndex];
			delete apiResult.tracks;
			delete apiResult.expanded;
			delete apiResult.gotMoreInfo;

			this.selectDiscogsInfo(apiResult);
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
		selectArtistAutosuggest(value) {
			this.artistInputValue = value;
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
					this.genreAutosuggestItems = this.genres.filter(genre => {
						return genre
							.toLowerCase()
							.startsWith(this.genreInputValue.toLowerCase());
					});
				} else this.genreAutosuggestItems = [];
			}, 1000);
		},
		selectGenreAutosuggest(value) {
			this.genreInputValue = value;
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
			if (volume > 0) this.video.player.unMute();
		},
		addTag(type) {
			if (type === "genres") {
				const genre = this.genreInputValue.trim();

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
				const artist = this.artistInputValue;
				if (this.song.artists.indexOf(artist) !== -1)
					return new Toast("Artist already exists");
				if (artist !== "") {
					this.song.artists.push(artist);
					this.artistInputValue = "";
					return false;
				}
				return new Toast("Artist cannot be empty");
			}

			return false;
		},
		removeTag(type, value) {
			if (type === "genres")
				this.song.genres.splice(this.song.genres.indexOf(value), 1);
			else if (type === "artists")
				this.song.artists.splice(this.song.artists.indexOf(value), 1);
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
		// remove(id) {
		// 	this.socket.dispatch("songs.remove", id, res => {
		// 		new Toast(res.message);
		// 	});
		// },
		...mapActions("modals/editSong", [
			"stopVideo",
			"loadVideoById",
			"pauseVideo",
			"getCurrentTime",
			"editSong",
			"updateSongField",
			"selectDiscogsInfo"
		]),
		...mapActions("modalVisibility", ["closeModal"])
	}
};
</script>

<style lang="scss">
.song-modal {
	.modal-card-title {
		text-align: center;
		margin-left: 24px;
	}

	.modal-card {
		width: 1160px;
		height: 100%;

		.modal-card-body {
			padding: 16px;
		}

		.modal-card-foot {
			div div {
				margin-right: 5px;
			}
			.right {
				display: flex;
				margin-left: auto;
				margin-right: 0;
			}
		}
	}
}
</style>

<style lang="scss" scoped>
.night-mode {
	.edit-section,
	.api-section,
	.api-result,
	.player-footer {
		background-color: var(--dark-grey-3) !important;
	}

	.api-result .tracks .track:hover,
	.selected-discogs-info {
		background-color: var(--dark-grey-2) !important;
	}

	.label,
	p,
	strong {
		color: var(--light-grey-2);
	}
}

.modal-card-body > div {
	display: flex;
	height: 100%;
}

.left-section {
	display: flex;
	flex-direction: column;
	margin-right: 16px;

	.top-section {
		display: flex;

		.player-section {
			width: 530px;
			display: flex;
			flex-direction: column;

			.player-footer {
				background-color: var(--light-grey);
				border: 1px rgba(163, 224, 255, 0.75) solid;
				border-radius: 0px 0px 5px 5px;
				display: flex;
				justify-content: space-between;
				height: 54px;

				> * {
					width: 33.3%;
					display: flex;
					align-items: center;
				}

				.player-footer-left {
					flex: 1;

					.material-icons {
						font-size: 38px;
						cursor: pointer;
					}

					.player-play-pause {
						color: var(--primary-color);
					}

					.player-stop {
						color: var(--red);
					}

					.player-fast-forward {
						color: var(--green);
					}
				}

				.player-footer-center {
					justify-content: center;
					align-items: center;
					flex: 2;
					font-size: 21px;
					font-weight: 400;

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

					#volumeSlider {
						width: 126px;
						margin-right: 10px;
						background-color: var(--light-grey);
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
		background-color: var(--light-grey);
		border: 1px rgba(163, 224, 255, 0.75) solid;
		margin-top: 16px;
		flex: 1;
		overflow: auto;
		border-radius: 5px;

		.album-get-button {
			background-color: var(--purple);
			color: var(--white);
			width: 32px;
			text-align: center;
			border-width: 0;
		}

		.duration-fill-button {
			background-color: var(--red);
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
			margin: 16px;
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
			width: 100%;
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

		.youtube-id-container {
			width: calc((100% - 32px) / 3);
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
	display: flex;
	flex-wrap: wrap;

	.api-section {
		width: 376px;
		background-color: var(--light-grey);
		border: 1px rgba(163, 224, 255, 0.75) solid;
		border-radius: 5px;
		padding: 16px;
		overflow: auto;
		height: 100%;

		> label {
			margin-top: 12px;
		}

		.top-container {
			display: flex;

			img {
				height: 85px;
				width: 85px;
			}

			.right-container {
				padding: 8px;
				display: flex;
				flex-direction: column;
				flex: 1;

				.album-title {
					flex: 1;
					font-weight: 600;
				}

				.bottom-row {
					display: flex;
					flex-flow: row;
					line-height: 15px;

					img {
						height: 15px;
						align-self: end;
						flex: 1;
						user-select: none;
						-moz-user-select: none;
						-ms-user-select: none;
						-webkit-user-select: none;
						cursor: pointer;
					}

					p {
						text-align: right;
					}

					.type-year {
						font-size: 13px;
						align-self: end;
					}
				}
			}
		}

		.bottom-container {
			padding: 12px;

			.bottom-container-field {
				line-height: 16px;
				margin-bottom: 8px;
				font-weight: 600;

				span {
					font-weight: 400;
				}
			}

			.bottom-container-field:last-of-type {
				margin-bottom: 0;
			}
		}

		.selected-discogs-info {
			background-color: var(--white);
			border: 1px solid var(--purple);
			border-radius: 5px;
			margin-bottom: 16px;

			.selected-discogs-info-none {
				font-size: 18px;
				text-align: center;
			}

			.bottom-row > p {
				flex: 1;
			}
		}

		.api-result {
			background-color: var(--white);
			border: 0.5px solid var(--primary-color);
			border-radius: 5px;
			margin-bottom: 16px;
		}

		button {
			background-color: var(--primary-color) !important;

			&:focus,
			&:hover {
				filter: contrast(0.75);
			}
		}

		.tracks {
			margin-top: 12px;

			.track:first-child {
				margin-top: 0;
				border-radius: 3px 3px 0 0;
			}

			.track:last-child {
				border-radius: 0 0 3px 3px;
			}

			.track {
				border: 0.5px solid var(--black);
				margin-top: -1px;
				line-height: 16px;
				display: flex;
				cursor: pointer;

				span {
					font-weight: 600;
					display: inline-block;
					margin-top: 7px;
					margin-bottom: 7px;
					margin-left: 7px;
				}

				p {
					display: inline-block;
					margin: 7px;
					flex: 1;
				}
			}

			.track:hover,
			.track:focus {
				background-color: var(--light-grey);
			}
		}

		.discogs-load-more {
			margin-bottom: 8px;
		}
	}
}

.modal-card-foot .is-primary {
	width: 200px;
}

input[type="range"] {
	-webkit-appearance: none;
	width: 100%;
	margin: 8.5px 0;
}
input[type="range"]:focus {
	outline-style: outset;
}
input[type="range"]::-webkit-slider-runnable-track {
	width: 100%;
	height: 3px;
	cursor: pointer;
	box-shadow: none;
	background: var(--grey-3);
	border-radius: none;
	border: none;
}
input[type="range"]::-webkit-slider-thumb {
	box-shadow: none;
	border: none;
	height: 20px;
	width: 20px;
	border-radius: 100px;
	background: var(--primary-color);
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: -8.5px;
}
input[type="range"]:focus::-webkit-slider-runnable-track {
	background: var(--grey-3);
}
input[type="range"]::-moz-range-track {
	width: 100%;
	height: 3px;
	cursor: pointer;
	box-shadow: none;
	background: var(--grey-3);
	border-radius: none;
	border: none;
}
input[type="range"]::-moz-range-thumb {
	box-shadow: none;
	border: none;
	height: 20px;
	width: 20px;
	border-radius: 100px;
	background: var(--primary-color);
	cursor: pointer;
}
input[type="range"]::-ms-track {
	width: 100%;
	height: 3px;
	cursor: pointer;
	background: transparent;
	border-color: transparent;
	color: transparent;
}
input[type="range"]::-ms-fill-lower {
	background: var(--grey-2);
	border: none;
	border-radius: none;
	box-shadow: none;
}
input[type="range"]::-ms-fill-upper {
	background: var(--grey-3);
	border: none;
	border-radius: none;
	box-shadow: none;
}
input[type="range"]::-ms-thumb {
	box-shadow: none;
	border: none;
	height: 20px;
	width: 20px;
	border-radius: 100px;
	background: var(--primary-color);
	cursor: pointer;
	height: 3px;
}
input[type="range"]:focus::-ms-fill-lower {
	background: var(--grey-3);
}
input[type="range"]:focus::-ms-fill-upper {
	background: var(--grey-3);
}
</style>
