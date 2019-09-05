<template>
	<div>
		<modal title="Edit Song" class="song-modal">
			<div slot="body">
				<div class="left-section">
					<div class="top-section">
						<div class="player-section">
							<div id="player"></div>
							<canvas
								id="durationCanvas"
								height="20"
								width="530"
							></canvas>
							<div class="player-footer">
								<div class="player-footer-left">
									<i
										class="material-icons player-play-pause"
										v-on:click="settings('play')"
										v-if="video.paused"
										>play_arrow</i
									>
									<i
										class="material-icons player-play-pause"
										v-on:click="settings('pause')"
										v-if="!video.paused"
										>pause</i
									>
									<i
										class="material-icons player-stop"
										v-on:click="settings('stop')"
										>stop</i
									>
									<i
										class="material-icons player-fast-forward"
										v-on:click="
											settings('skipToLast10Secs')
										"
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
										id="volumeSlider"
										min="0"
										max="100"
										class="active"
										v-on:change="changeVolume()"
										v-on:input="changeVolume()"
									/>
								</div>
							</div>
						</div>
						<img
							class="thumbnail-preview"
							:src="editing.song.thumbnail"
							onerror="this.src='/assets/notes-transparent.png'"
						/>
					</div>
					<div class="edit-section">
						<div class="control is-grouped">
							<div class="title-container">
								<label class="label">Title</label>
								<p class="control has-addons">
									<input
										class="input"
										type="text"
										v-model="editing.song.title"
									/>
									<button
										class="button album-get-button"
										v-on:click="getAlbumData('title')"
									>
										<i class="material-icons album-get-icon"
											>album</i
										>
									</button>
								</p>
							</div>
							<div class="duration-container">
								<label class="label">Duration</label>
								<p class="control">
									<input
										class="input"
										type="text"
										v-model.number="editing.song.duration"
									/>
								</p>
							</div>
							<div class="skip-duration-container">
								<label class="label">Skip duration</label>
								<p class="control">
									<input
										class="input"
										type="text"
										v-model.number="
											editing.song.skipDuration
										"
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
										v-model="editing.song.thumbnail"
									/>
									<button
										class="button album-get-button"
										v-on:click="getAlbumData('albumArt')"
									>
										<i class="material-icons album-get-icon"
											>album</i
										>
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
										id="new-artist"
										v-model="artistInputValue"
										v-on:blur="blurArtistInput()"
										v-on:focus="focusArtistInput()"
										v-on:keydown="keydownArtistInput()"
									/>
									<button
										class="button album-get-button"
										v-on:click="getAlbumData('artists')"
									>
										<i class="material-icons album-get-icon"
											>album</i
										>
									</button>
									<button
										class="button is-info add-button"
										v-on:click="addTag('artists')"
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
										v-on:click="
											selectArtistAutosuggest(item)
										"
										v-for="(item,
										index) in artistAutosuggestItems"
										:key="index"
										>{{ item }}</span
									>
								</div>
								<div class="list-container">
									<div
										class="list-item"
										v-for="(artist, index) in editing.song
											.artists"
										:key="index"
									>
										<div
											class="list-item-circle"
											v-on:click="
												removeTag('artists', index)
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
										id="new-genre"
										v-model="genreInputValue"
										v-on:blur="blurGenreInput()"
										v-on:focus="focusGenreInput()"
										v-on:keydown="keydownGenreInput()"
									/>
									<button
										class="button album-get-button"
										v-on:click="getAlbumData('genres')"
									>
										<i class="material-icons album-get-icon"
											>album</i
										>
									</button>
									<button
										class="button is-info add-button"
										v-on:click="addTag('genres')"
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
										tabindex="0"
										v-on:click="
											selectGenreAutosuggest(item)
										"
										v-for="(item,
										index) in genreAutosuggestItems"
										:key="index"
										>{{ item }}</span
									>
								</div>
								<div class="list-container">
									<div
										class="list-item"
										v-for="(genre, index) in editing.song
											.genres"
										:key="index"
									>
										<div
											class="list-item-circle"
											v-on:click="
												removeTag('genres', index)
											"
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
										v-model="editing.song.songId"
									/>
								</p>
							</div>
						</div>
					</div>
				</div>
				<div class="right-section">
					<div class="api-section">
						<div
							class="selected-discogs-info"
							v-if="!editing.song.discogs"
						>
							<p class="selected-discogs-info-none">None</p>
						</div>
						<div
							class="selected-discogs-info"
							v-if="editing.song.discogs"
						>
							<div class="top-container">
								<img
									:src="editing.song.discogs.album.albumArt"
								/>
								<div class="right-container">
									<p class="album-title">
										{{ editing.song.discogs.album.title }}
									</p>
									<div class="bottom-row">
										<p class="type-year">
											<span>{{
												editing.song.discogs.album.type
											}}</span>
											•
											<span>{{
												editing.song.discogs.album.year
											}}</span>
										</p>
									</div>
								</div>
							</div>
							<div class="bottom-container">
								<p class="bottom-container-field">
									Artists:
									<span>{{
										editing.song.discogs.album.artists.join(
											", "
										)
									}}</span>
								</p>
								<p class="bottom-container-field">
									Genres:
									<span>{{
										editing.song.discogs.album.genres.join(
											", "
										)
									}}</span>
								</p>
								<p class="bottom-container-field">
									Data quality:
									<span>{{
										editing.song.discogs.dataQuality
									}}</span>
								</p>
								<p class="bottom-container-field">
									Track:
									<span
										>{{
											editing.song.discogs.track.position
										}}.
										{{
											editing.song.discogs.track.title
										}}</span
									>
								</p>
							</div>
						</div>
						<p class="control is-expanded">
							<label class="label">Search query</label>
							<input
								class="input"
								type="text"
								v-model="discogsQuery"
								@change="onDiscogsQueryChange"
							/>
						</p>
						<button
							class="button is-info is-fullwidth"
							v-on:click="searchDiscogsForPage(1)"
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
								:key="index"
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
												v-on:click="
													toggleAPIResult(index)
												"
											/>
											<img
												src="/assets/arrow_down.svg"
												v-if="!result.expanded"
												v-on:click="
													toggleAPIResult(index)
												"
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
											:key="trackIndex"
											v-on:click="
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
			<div slot="footer" class="footer-buttons">
				<button
					class="button is-success"
					v-on:click="save(editing.song, false)"
				>
					<i class="material-icons save-changes">done</i>
					<span>&nbsp;Save</span>
				</button>
				<button
					class="button is-success"
					v-on:click="save(editing.song, true)"
				>
					<i class="material-icons save-changes">done</i>
					<span>&nbsp;Save and close</span>
				</button>
				<button
					class="button is-danger"
					v-on:click="
						closeModal({ sector: 'admin', modal: 'editSong' })
					"
				>
					<span>&nbsp;Close</span>
				</button>
			</div>
		</modal>
		<div
			id="genre-helper-container"
			v-bind:style="{
				width: genreHelper.width + 'px',
				height: genreHelper.height + 'px',
				top: genreHelper.top + 'px',
				left: genreHelper.left + 'px'
			}"
			v-if="genreHelper.shown"
			@mousedown="onResizeGenreHelper"
		>
			<div
				class="genre-helper-header"
				@mousedown="onDragGenreHelper"
			></div>
			<div class="genre-helper-body">
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
			</div>
		</div>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import { Toast } from "vue-roaster";

import io from "../../io";
import validation from "../../validation";
import Modal from "./Modal.vue";

export default {
	components: { Modal },
	data() {
		return {
			discogsQuery: "",
			youtubeVideoDuration: 0.0,
			youtubeVideoCurrentTime: 0.0,
			youtubeVideoNote: "",
			useHTTPS: false,
			discogs: {
				apiResults: [],
				page: 1,
				pages: 1,
				disableLoadMore: false
			},
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
			genreHelper: {
				width: 200,
				height: 200,
				top: 0,
				left: 0,
				shown: false,
				pos1: 0,
				pos2: 0,
				pos3: 0,
				pos4: 0
			},
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
		...mapState("admin/songs", {
			video: state => state.video,
			editing: state => state.editing,
			songs: state => state.songs
		}),
		...mapState("modals", {
			modals: state => state.modals.admin
		})
	},
	watch: {
		/* eslint-disable */
		"editing.song.duration": function() {
			this.drawCanvas();
		},
		"editing.song.skipDuration": function() {
			this.drawCanvas();
		}
		/* eslint-enable */
	},
	methods: {
		save(songToCopy, close) {
			const song = JSON.parse(JSON.stringify(songToCopy));

			if (!song.title)
				return Toast.methods.addToast(
					"Please fill in all fields",
					8000
				);
			if (!song.thumbnail)
				return Toast.methods.addToast(
					"Please fill in all fields",
					8000
				);

			// Duration
			if (
				Number(song.skipDuration) + Number(song.duration) >
				this.youtubeVideoDuration
			) {
				return Toast.methods.addToast(
					"Duration can't be higher than the length of the video",
					8000
				);
			}

			// Title
			if (!validation.isLength(song.title, 1, 100))
				return Toast.methods.addToast(
					"Title must have between 1 and 100 characters.",
					8000
				);
			/* if (!validation.regex.ascii.test(song.title))
				return Toast.methods.addToast(
					"Invalid title format. Only ascii characters are allowed.",
					8000
				); */

			// Artists
			if (song.artists.length < 1 || song.artists.length > 10)
				return Toast.methods.addToast(
					"Invalid artists. You must have at least 1 artist and a maximum of 10 artists.",
					8000
				);
			let error;
			song.artists.forEach(artist => {
				if (!validation.isLength(artist, 1, 32)) {
					error = "Artist must have between 1 and 32 characters.";
					return error;
				}
				if (!validation.regex.ascii.test(artist)) {
					error =
						"Invalid artist format. Only ascii characters are allowed.";
					return error;
				}
				if (artist === "NONE") {
					error =
						'Invalid artist format. Artists are not allowed to be named "NONE".';
					return error;
				}

				return false;
			});
			if (error) return Toast.methods.addToast(error, 8000);

			// Genres
			/* error = undefined;
			song.genres.forEach(genre => {
				if (!validation.isLength(genre, 1, 16)) {
					error = "Genre must have between 1 and 16 characters.";
					return error;
				}
				if (!validation.regex.azAZ09_.test(genre)) {
					error =
						"Invalid genre format. Only ascii characters are allowed.";
					return error;
				}

				return false;
			});
			if (error) return Toast.methods.addToast(error, 8000); */

			// Thumbnail
			if (!validation.isLength(song.thumbnail, 8, 256))
				return Toast.methods.addToast(
					"Thumbnail must have between 8 and 256 characters.",
					8000
				);
			if (this.useHTTPS && song.thumbnail.indexOf("https://") !== 0) {
				return Toast.methods.addToast(
					'Thumbnail must start with "https://".',
					8000
				);
			}

			if (
				!this.useHTTPS &&
				(song.thumbnail.indexOf("http://") !== 0 &&
					song.thumbnail.indexOf("https://") !== 0)
			) {
				return Toast.methods.addToast(
					'Thumbnail must start with "http://".',
					8000
				);
			}

			return this.socket.emit(
				`${this.editing.type}.update`,
				song._id,
				song,
				res => {
					Toast.methods.addToast(res.message, 4000);
					if (res.status === "success") {
						this.songs.forEach(originalSong => {
							const updatedSong = song;
							if (originalSong._id === updatedSong._id) {
								Object.keys(originalSong).forEach(n => {
									updatedSong[n] = originalSong[n];
									return originalSong[n];
								});
							}
						});
					}
					if (close)
						this.closeModal({
							sector: "admin",
							modal: "editSong"
						});
				}
			);
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
		getAlbumData(type) {
			if (!this.editing.song.discogs) return;
			if (type === "title")
				this.updateSongField({
					field: "title",
					value: this.editing.song.discogs.track.title
				});
			if (type === "albumArt")
				this.updateSongField({
					field: "thumbnail",
					value: this.editing.song.discogs.album.albumArt
				});
			if (type === "genres")
				this.updateSongField({
					field: "genres",
					value: JSON.parse(
						JSON.stringify(this.editing.song.discogs.album.genres)
					)
				});
			if (type === "artists")
				this.updateSongField({
					field: "artists",
					value: JSON.parse(
						JSON.stringify(this.editing.song.discogs.album.artists)
					)
				});
		},
		searchDiscogsForPage(page) {
			const query = this.discogsQuery;

			this.socket.emit("apis.searchDiscogs", query, page, res => {
				if (res.status === "success") {
					if (page === 1)
						Toast.methods.addToast(
							`Successfully searched. Got ${res.results.length} results.`,
							4000
						);
					else
						Toast.methods.addToast(
							`Successfully got ${res.results.length} more results.`,
							4000
						);

					if (page === 1) {
						this.discogs.apiResults = [];
					}

					this.discogs.pages = res.pages;

					this.discogs.apiResults = this.discogs.apiResults.concat(
						res.results.map(result => {
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
				} else Toast.methods.addToast(res.message, 8000);
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
					if (this.video.paused) this.pauseVideo(false);
					this.video.player.seekTo(
						this.editing.song.duration -
							10 +
							this.editing.song.skipDuration
					);
					break;
			}
		},
		changeVolume() {
			const volume = document.getElementById("volumeSlider").value;
			localStorage.setItem("volume", volume);
			this.video.player.setVolume(volume);
			if (volume > 0) this.video.player.unMute();
		},
		addTag(type) {
			if (type === "genres") {
				const genre = document
					.getElementById("new-genre")
					.value.toLowerCase()
					.trim();
				if (this.editing.song.genres.indexOf(genre) !== -1)
					return Toast.methods.addToast("Genre already exists", 3000);
				if (genre) {
					this.editing.song.genres.push(genre);
					document.getElementById("new-genre").value = "";
					return false;
				}

				return Toast.methods.addToast("Genre cannot be empty", 3000);
			}
			if (type === "artists") {
				const artist = document.getElementById("new-artist").value;
				if (this.editing.song.artists.indexOf(artist) !== -1)
					return Toast.methods.addToast(
						"Artist already exists",
						3000
					);
				if (document.getElementById("new-artist").value !== "") {
					this.editing.song.artists.push(artist);
					document.getElementById("new-artist").value = "";
					return false;
				}
				return Toast.methods.addToast("Artist cannot be empty", 3000);
			}

			return false;
		},
		removeTag(type, index) {
			if (type === "genres") this.editing.song.genres.splice(index, 1);
			else if (type === "artists")
				this.editing.song.artists.splice(index, 1);
		},
		drawCanvas() {
			const canvasElement = document.getElementById("durationCanvas");
			const ctx = canvasElement.getContext("2d");

			const videoDuration = Number(this.youtubeVideoDuration);

			const skipDuration = Number(this.editing.song.skipDuration);
			const duration = Number(this.editing.song.duration);
			const afterDuration = videoDuration - (skipDuration + duration);

			const width = 530;

			const currentTime = this.video.player.getCurrentTime();

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
		onDragGenreHelper(e) {
			const e1 = e || window.event;
			e1.preventDefault();

			this.genreHelper.pos3 = e1.clientX;
			this.genreHelper.pos4 = e1.clientY;

			document.onmousemove = e => {
				const e2 = e || window.event;
				e2.preventDefault();
				// calculate the new cursor position:
				this.genreHelper.pos1 = this.genreHelper.pos3 - e.clientX;
				this.genreHelper.pos2 = this.genreHelper.pos4 - e.clientY;
				this.genreHelper.pos3 = e.clientX;
				this.genreHelper.pos4 = e.clientY;
				// set the element's new position:
				this.genreHelper.top =
					this.genreHelper.top - this.genreHelper.pos2;
				this.genreHelper.left =
					this.genreHelper.left - this.genreHelper.pos1;
			};

			document.onmouseup = () => {
				document.onmouseup = null;
				document.onmousemove = null;

				this.saveGenreHelper();
			};
		},
		onResizeGenreHelper(e) {
			if (e.target.id !== "genre-helper-container") return;

			document.onmouseup = () => {
				document.onmouseup = null;

				const { height, width } = e.target.style;

				this.genreHelper.height = Number(
					height
						.split("")
						.splice(0, height.length - 2)
						.join("")
				);
				this.genreHelper.width = Number(
					width
						.split("")
						.splice(0, width.length - 2)
						.join("")
				);

				this.saveGenreHelper();
			};
		},
		toggleGenreHelper() {
			this.genreHelper.shown = !this.genreHelper.shown;
			this.saveGenreHelper();
		},
		resetGenreHelper() {
			this.genreHelper.top = 0;
			this.genreHelper.left = 0;
			this.genreHelper.width = 200;
			this.genreHelper.height = 200;
			this.saveGenreHelper();
		},
		saveGenreHelper() {
			localStorage.setItem(
				"genreHelper",
				JSON.stringify({
					height: this.genreHelper.height,
					width: this.genreHelper.width,
					top: this.genreHelper.top,
					left: this.genreHelper.left,
					shown: this.genreHelper.shown
				})
			);
		},
		...mapActions("admin/songs", [
			"stopVideo",
			"loadVideoById",
			"pauseVideo",
			"getCurrentTime",
			"editSong",
			"updateSongField",
			"selectDiscogsInfo"
		]),
		...mapActions("modals", ["closeModal"])
	},
	mounted() {
		// if (this.modals.editSong = false) this.video.player.stopVideo();

		// this.loadVideoById(
		//   this.editing.song.songId,
		//   this.editing.song.skipDuration
		// );

		if (localStorage.genreHelper) {
			const genreHelper = JSON.parse(localStorage.getItem("genreHelper"));
			this.genreHelper.height = genreHelper.height;
			this.genreHelper.width = genreHelper.width;
			this.genreHelper.top = genreHelper.top;
			this.genreHelper.left = genreHelper.left;
			this.genreHelper.shown = genreHelper.shown;
		}

		this.discogsQuery = this.editing.song.title;

		lofig.get("cookie.secure", res => {
			this.useHTTPS = res;
		});

		io.getSocket(socket => {
			this.socket = socket;
		});

		this.interval = setInterval(() => {
			if (
				this.video.paused === false &&
				this.playerReady &&
				this.video.player.getCurrentTime() -
					this.editing.song.skipDuration >
					this.editing.song.duration
			) {
				this.video.paused = false;
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

		this.video.player = new window.YT.Player("player", {
			height: 298,
			width: 530,
			videoId: this.editing.song.songId,
			playerVars: {
				controls: 0,
				iv_load_policy: 3,
				rel: 0,
				showinfo: 0,
				autoplay: 1
			},
			startSeconds: this.editing.song.skipDuration,
			events: {
				onReady: () => {
					let volume = parseInt(localStorage.getItem("volume"));
					volume = typeof volume === "number" ? volume : 20;
					console.log(`Seekto: ${this.editing.song.skipDuration}`);
					this.video.player.seekTo(this.editing.song.skipDuration);
					this.video.player.setVolume(volume);
					if (volume > 0) this.video.player.unMute();
					this.youtubeVideoDuration = this.video.player.getDuration();
					this.youtubeVideoNote = "(~)";
					this.playerReady = true;

					this.drawCanvas();
				},
				onStateChange: event => {
					this.drawCanvas();

					if (event.data === 1) {
						if (!this.video.autoPlayed) {
							this.video.autoPlayed = true;
							return this.video.player.stopVideo();
						}

						this.video.paused = false;
						let youtubeDuration = this.video.player.getDuration();
						this.youtubeVideoDuration = youtubeDuration;
						this.youtubeVideoNote = "";
						youtubeDuration -= this.editing.song.skipDuration;
						if (this.editing.song.duration > youtubeDuration + 1) {
							this.video.player.stopVideo();
							this.video.paused = true;
							return Toast.methods.addToast(
								"Video can't play. Specified duration is bigger than the YouTube song duration.",
								4000
							);
						}
						if (this.editing.song.duration <= 0) {
							this.video.player.stopVideo();
							this.video.paused = true;
							return Toast.methods.addToast(
								"Video can't play. Specified duration has to be more than 0 seconds.",
								4000
							);
						}

						if (
							this.video.player.getCurrentTime() <
							this.editing.song.skipDuration
						) {
							return this.video.player.seekTo(
								this.editing.song.skipDuration
							);
						}
					} else if (event.data === 2) {
						this.video.paused = true;
					}

					return false;
				}
			}
		});

		let volume = parseInt(localStorage.getItem("volume"));
		document.getElementById("volumeSlider").value = volume =
			typeof volume === "number" ? volume : 20;
	},
	beforeDestroy() {
		this.playerReady = false;
		clearInterval(this.interval);
	}
};
</script>

<style lang="scss">
@import "styles/global.scss";

#genre-helper-container {
	background-color: white;
	position: fixed;
	z-index: 10000000;
	resize: both;
	overflow: auto;
	border: 1px solid #d3d3d3;
	min-height: 50px !important;
	min-width: 50px !important;

	.genre-helper-header {
		cursor: move;
		z-index: 100000001;
		background-color: $musareBlue;
		padding: 10px;
		display: block;
		height: 10px;
		width: 100%;
	}

	.genre-helper-body {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-evenly;

		span {
			padding: 3px 6px;
		}
	}
}

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
	}
}
</style>

<style lang="scss" scoped>
@import "styles/global.scss";
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
				background-color: #f4f4f4;
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
						color: $musareBlue;
					}

					.player-stop {
						color: $red;
					}

					.player-fast-forward {
						color: $green;
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
						background-color: #f4f4f4;
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
		background-color: #f4f4f4;
		border: 1px rgba(163, 224, 255, 0.75) solid;
		margin-top: 16px;
		flex: 1;
		overflow: auto;
		border-radius: 5px;

		.album-get-button {
			background-color: $purple;
			color: white;
			width: 32px;
			text-align: center;
			border-width: 0;
		}

		.add-button {
			background-color: $musareBlue !important;
			width: 32px;

			i {
				font-size: 32px;
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
					color: $musareBlue;
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
			background-color: $musareBlue;
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
				color: $musareBlue;
				font-size: 14px;
				margin-left: 1px;
			}
		}

		.list-item-circle:hover,
		.list-item-circle:focus {
			i {
				color: white;
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
			background: white;
			width: calc(100% + 1px);
			top: 57px;
			z-index: 200;
			overflow: auto;
			max-height: 100%;
			clear: both;

			.autosuggest-item {
				padding: 8px;
				display: block;
				border: 1px solid #dbdbdb;
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
				background-color: #eee;
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
		background-color: #f4f4f4;
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
			background-color: white;
			border: 1px solid $purple;
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
			background-color: white;
			border: 0.5px solid $musareBlue;
			border-radius: 5px;
			margin-bottom: 16px;
		}

		button {
			background-color: $musareBlue !important;
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
				border: 0.5px solid black;
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
				background-color: #f4f4f4;
			}
		}

		.discogs-load-more {
			margin-bottom: 8px;
		}
	}
}

.footer-buttons {
	margin-left: auto;
	margin-right: auto;
}

input[type="range"] {
	-webkit-appearance: none;
	width: 100%;
	margin: 8.5px 0;
}
input[type="range"]:focus {
	outline: none;
}
input[type="range"]::-webkit-slider-runnable-track {
	width: 100%;
	height: 3px;
	cursor: pointer;
	box-shadow: none;
	background: #7e7e7e;
	border-radius: none;
	border: none;
}
input[type="range"]::-webkit-slider-thumb {
	box-shadow: none;
	border: none;
	height: 20px;
	width: 20px;
	border-radius: 100px;
	background: #03a9f4;
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: -8.5px;
}
input[type="range"]:focus::-webkit-slider-runnable-track {
	background: #7e7e7e;
}
input[type="range"]::-moz-range-track {
	width: 100%;
	height: 3px;
	cursor: pointer;
	box-shadow: none;
	background: #7e7e7e;
	border-radius: none;
	border: none;
}
input[type="range"]::-moz-range-thumb {
	box-shadow: none;
	border: none;
	height: 20px;
	width: 20px;
	border-radius: 100px;
	background: #03a9f4;
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
	background: #717171;
	border: none;
	border-radius: none;
	box-shadow: none;
}
input[type="range"]::-ms-fill-upper {
	background: #7e7e7e;
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
	background: #03a9f4;
	cursor: pointer;
	height: 3px;
}
input[type="range"]:focus::-ms-fill-lower {
	background: #7e7e7e;
}
input[type="range"]:focus::-ms-fill-upper {
	background: #7e7e7e;
}
</style>
