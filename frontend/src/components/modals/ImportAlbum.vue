<template>
	<div>
		<modal title="Import Album" class="import-album-modal">
			<template #body>
				<div class="tabs-container discogs-container">
					<div class="tab-selection">
						<button
							class="button is-default"
							:class="{ selected: discogsTab === 'search' }"
							ref="discogs-search-tab"
							@click="showDiscogsTab('search')"
						>
							Search
						</button>
						<button
							v-if="discogsAlbum && discogsAlbum.album"
							class="button is-default"
							:class="{ selected: discogsTab === 'selected' }"
							ref="discogs-selected-tab"
							@click="showDiscogsTab('selected')"
						>
							Selected
						</button>
						<button
							v-else
							class="button is-default"
							content="No album selected"
							v-tippy="{ theme: 'info' }"
						>
							Selected
						</button>
					</div>
					<div
						class="tab search-discogs-album"
						v-show="discogsTab === 'search'"
					>
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
							class="button is-fullwidth is-info"
							@click="searchDiscogsForPage(1)"
						>
							Search
						</button>
						<button
							class="button is-fullwidth is-danger"
							@click="clearDiscogsResults()"
						>
							Clear
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
									<button
										class="button is-primary"
										@click="selectAlbum(result)"
									>
										Import album
									</button>
									<div class="tracks">
										<div
											class="track"
											v-for="track in result.tracks"
											:key="`${track.position}-${track.title}`"
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
					<div
						v-if="discogsAlbum && discogsAlbum.album"
						class="tab discogs-album"
						v-show="discogsTab === 'selected'"
					>
						<div class="top-container">
							<img :src="discogsAlbum.album.albumArt" />
							<div class="right-container">
								<p class="album-title">
									{{ discogsAlbum.album.title }}
								</p>
								<div class="bottom-row">
									<img
										src="/assets/arrow_up.svg"
										v-if="discogsAlbum.expanded"
										@click="toggleDiscogsAlbum()"
									/>
									<img
										src="/assets/arrow_down.svg"
										v-if="!discogsAlbum.expanded"
										@click="toggleDiscogsAlbum()"
									/>
									<p class="type-year">
										<span>{{
											discogsAlbum.album.type
										}}</span>
										•
										<span>{{
											discogsAlbum.album.year
										}}</span>
									</p>
								</div>
							</div>
						</div>
						<div
							class="bottom-container"
							v-if="discogsAlbum.expanded"
						>
							<p class="bottom-container-field">
								Artists:
								<span>{{
									discogsAlbum.album.artists.join(", ")
								}}</span>
							</p>
							<p class="bottom-container-field">
								Genres:
								<span>{{
									discogsAlbum.album.genres.join(", ")
								}}</span>
							</p>
							<p class="bottom-container-field">
								Data quality:
								<span>{{ discogsAlbum.dataQuality }}</span>
							</p>
							<div class="tracks">
								<div
									class="track"
									tabindex="0"
									v-for="track in discogsAlbum.tracks"
									:key="`${track.position}-${track.title}`"
								>
									<span>{{ track.position }}.</span>
									<p>{{ track.title }}</p>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="import-youtube-playlist">
					<p class="control is-expanded">
						<input
							class="input"
							type="text"
							placeholder="Enter YouTube Playlist URL here..."
							v-model="search.playlist.query"
							@keyup.enter="importPlaylist()"
						/>
					</p>
					<button
						class="button is-fullwidth is-info"
						@click="importPlaylist()"
					>
						<i class="material-icons icon-with-button">publish</i
						>Import
					</button>
					<button
						class="button is-fullwidth is-danger"
						@click="resetTrackSongs()"
					>
						Reset
					</button>
					<draggable
						v-if="playlistSongs.length > 0"
						group="songs"
						v-model="playlistSongs"
						item-key="_id"
						@start="drag = true"
						@end="drag = false"
						@change="log"
					>
						<template #item="{ element }">
							<song-item
								:key="`playlist-song-${element._id}`"
								:song="element"
							>
							</song-item>
						</template>
					</draggable>
				</div>
				<div
					class="track-boxes"
					v-if="discogsAlbum && discogsAlbum.album"
				>
					<div
						class="track-box"
						v-for="(track, index) in discogsAlbum.tracks"
						:key="`${track.position}-${track.title}`"
					>
						<div class="track-position-title">
							<span>{{ track.position }}.</span>
							<p>{{ track.title }}</p>
						</div>
						<draggable
							class="track-box-songs-drag-area"
							group="songs"
							v-model="trackSongs[index]"
							item-key="_id"
							@start="drag = true"
							@end="drag = false"
							@change="log"
						>
							<template #item="{ element }">
								<song-item
									:key="`track-song-${element._id}`"
									:song="element"
								>
								</song-item>
							</template>
						</draggable>
					</div>
				</div>
			</template>
			<template #footer>
				<button class="button is-primary" @click="tryToAutoMove()">
					Try to auto move
				</button>
				<button class="button is-primary" @click="startEditingSongs()">
					Edit songs
				</button>
				<p class="is-expanded checkbox-control">
					<label class="switch">
						<input
							type="checkbox"
							id="prefill-discogs"
							v-model="localPrefillDiscogs"
						/>
						<span class="slider round"></span>
					</label>

					<label for="prefill-discogs">
						<p>Prefill Discogs</p>
					</label>
				</p>
			</template>
		</modal>
	</div>
</template>

<script>
import { mapGetters, mapActions } from "vuex";

import draggable from "vuedraggable";
import Toast from "toasters";
import ws from "@/ws";
import { mapModalState, mapModalActions } from "@/vuex_helpers";

import SongItem from "../SongItem.vue";

export default {
	components: { SongItem, draggable },
	props: {
		modalUuid: { type: String, default: "" }
	},
	data() {
		return {
			isImportingPlaylist: false,
			trackSongs: [],
			songsToEdit: [],
			// currentEditSongIndex: 0,
			search: {
				playlist: {
					query: ""
				}
			},
			discogsQuery: "",
			discogs: {
				apiResults: [],
				page: 1,
				pages: 1,
				disableLoadMore: false
			}
		};
	},
	computed: {
		playlistSongs: {
			get() {
				return this.$store.state.modals.importAlbum[this.modalUuid]
					.playlistSongs;
			},
			set(playlistSongs) {
				this.$store.commit(
					`modals/importAlbum/${this.modalUuid}/updatePlaylistSongs`,
					playlistSongs
				);
			}
		},
		localPrefillDiscogs: {
			get() {
				return this.$store.state.modals.importAlbum[this.modalUuid]
					.prefillDiscogs;
			},
			set(prefillDiscogs) {
				this.$store.commit(
					`modals/importAlbum/${this.modalUuid}/updatePrefillDiscogs`,
					prefillDiscogs
				);
			}
		},
		...mapModalState("modals/importAlbum/MODAL_UUID", {
			discogsTab: state => state.discogsTab,
			discogsAlbum: state => state.discogsAlbum,
			editingSongs: state => state.editingSongs,
			prefillDiscogs: state => state.prefillDiscogs
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		ws.onConnect(this.init);

		this.socket.on("event:admin.song.updated", res => {
			this.updateTrackSong(res.data.song);
		});
	},
	beforeUnmount() {
		this.selectDiscogsAlbum({});
		this.setPlaylistSongs([]);
		this.showDiscogsTab("search");
		this.socket.dispatch("apis.leaveRoom", "import-album");
		// Delete the VueX module that was created for this modal, after all other cleanup tasks are performed
		this.$store.unregisterModule(["modals", "importAlbum", this.modalUuid]);
	},
	methods: {
		init() {
			this.socket.dispatch("apis.joinRoom", "import-album");
		},
		startEditingSongs() {
			this.songsToEdit = [];
			this.trackSongs.forEach((songs, index) => {
				songs.forEach(song => {
					const discogsAlbum = JSON.parse(
						JSON.stringify(this.discogsAlbum)
					);
					discogsAlbum.track = discogsAlbum.tracks[index];
					delete discogsAlbum.tracks;
					delete discogsAlbum.expanded;
					delete discogsAlbum.gotMoreInfo;

					const songToEdit = {
						youtubeId: song.youtubeId,
						prefill: {
							discogs: discogsAlbum
						}
					};

					if (this.prefillDiscogs) {
						songToEdit.prefill.title = discogsAlbum.track.title;
						songToEdit.prefill.thumbnail =
							discogsAlbum.album.albumArt;
						songToEdit.prefill.genres = JSON.parse(
							JSON.stringify(discogsAlbum.album.genres)
						);
						songToEdit.prefill.artists = JSON.parse(
							JSON.stringify(discogsAlbum.album.artists)
						);
					}

					this.songsToEdit.push(songToEdit);
				});
			});

			if (this.songsToEdit.length === 0)
				new Toast("You can't edit 0 songs.");
			else {
				this.openModal({
					modal: "editSongs",
					data: { songs: this.songsToEdit }
				});
			}
		},
		log(evt) {
			window.console.log(evt);
		},
		importPlaylist() {
			if (this.isImportingPlaylist)
				return new Toast("A playlist is already importing.");
			this.isImportingPlaylist = true;

			// import query is blank
			if (!this.search.playlist.query)
				return new Toast("Please enter a YouTube playlist URL.");

			const regex = /[\\?&]list=([^&#]*)/;
			const splitQuery = regex.exec(this.search.playlist.query);

			if (!splitQuery) {
				return new Toast({
					content: "Please enter a valid YouTube playlist URL.",
					timeout: 4000
				});
			}

			// don't give starting import message instantly in case of instant error
			setTimeout(() => {
				if (this.isImportingPlaylist) {
					new Toast(
						"Starting to import your playlist. This can take some time to do."
					);
				}
			}, 750);

			return this.socket.dispatch(
				"songs.requestSet",
				this.search.playlist.query,
				false,
				true,
				res => {
					this.isImportingPlaylist = false;
					const songs = res.songs.filter(song => !song.verified);
					const songsAlreadyVerified =
						res.songs.length - songs.length;
					this.setPlaylistSongs(songs);
					if (this.discogsAlbum.tracks) {
						this.trackSongs = this.discogsAlbum.tracks.map(
							() => []
						);
						this.tryToAutoMove();
					}
					if (songsAlreadyVerified > 0)
						new Toast(
							`${songsAlreadyVerified} songs were already verified, skipping those.`
						);
					return new Toast({ content: res.message, timeout: 20000 });
				}
			);
		},
		tryToAutoMove() {
			const { tracks } = this.discogsAlbum;
			const { trackSongs } = this;
			const playlistSongs = JSON.parse(
				JSON.stringify(this.playlistSongs)
			);

			tracks.forEach((track, index) => {
				playlistSongs.forEach(playlistSong => {
					if (
						playlistSong.title
							.toLowerCase()
							.trim()
							.indexOf(track.title.toLowerCase().trim()) !== -1
					) {
						playlistSongs.splice(
							playlistSongs.indexOf(playlistSong),
							1
						);
						trackSongs[index].push(playlistSong);
					}
				});
			});

			this.updatePlaylistSongs(playlistSongs);
		},
		resetTrackSongs() {
			this.resetPlaylistSongs();
			this.trackSongs = this.discogsAlbum.tracks.map(() => []);
		},
		selectAlbum(result) {
			this.selectDiscogsAlbum(result);
			this.trackSongs = this.discogsAlbum.tracks.map(() => []);
			if (this.playlistSongs.length > 0) this.tryToAutoMove();
			// this.clearDiscogsResults();
			this.showDiscogsTab("selected");
		},
		toggleAPIResult(index) {
			const apiResult = this.discogs.apiResults[index];
			if (apiResult.expanded === true) apiResult.expanded = false;
			else if (apiResult.gotMoreInfo === true) apiResult.expanded = true;
			else {
				fetch(apiResult.album.resourceUrl)
					.then(response => response.json())
					.then(data => {
						apiResult.album.artists = [];
						apiResult.album.artistIds = [];
						const artistRegex = /\\([0-9]+\\)$/;

						apiResult.dataQuality = data.data_quality;
						data.artists.forEach(artist => {
							apiResult.album.artists.push(
								artist.name.replace(artistRegex, "")
							);
							apiResult.album.artistIds.push(artist.id);
						});
						apiResult.tracks = data.tracklist.map(track => ({
							position: track.position,
							title: track.title
						}));
						apiResult.expanded = true;
						apiResult.gotMoreInfo = true;
					});
			}
		},
		clearDiscogsResults() {
			this.discogs.apiResults = [];
			this.discogs.page = 1;
			this.discogs.pages = 1;
			this.discogs.disableLoadMore = false;
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
		updateTrackSong(updatedSong) {
			this.updatePlaylistSong(updatedSong);
			this.trackSongs.forEach((songs, indexA) => {
				songs.forEach((song, indexB) => {
					if (song._id === updatedSong._id)
						this.trackSongs[indexA][indexB] = updatedSong;
				});
			});
		},
		...mapActions({
			showDiscogsTab(dispatch, payload) {
				if (this.$refs[`discogs-${payload}-tab`])
					this.$refs[`discogs-${payload}-tab`].scrollIntoView({
						block: "nearest"
					});
				return dispatch(
					`modals/importAlbum/${this.modalUuid}/showDiscogsTab`,
					payload
				);
			}
		}),
		...mapModalActions("modals/importAlbum/MODAL_UUID", [
			"toggleDiscogsAlbum",
			"setPlaylistSongs",
			"updatePlaylistSongs",
			"selectDiscogsAlbum",
			"updateEditingSongs",
			"resetPlaylistSongs",
			"togglePrefillDiscogs",
			"updatePlaylistSong"
		]),
		...mapActions("modals/editSongs", ["editSongs"]),
		...mapActions("modalVisibility", ["closeModal", "openModal"])
	}
};
</script>

<style lang="less">
.night-mode {
	.search-discogs-album,
	.discogs-album,
	.import-youtube-playlist,
	.track-boxes,
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

	.api-result {
		background-color: var(--dark-grey-3) !important;
	}

	.api-result .tracks .track:hover,
	.api-result .tracks .track:focus,
	.discogs-album .tracks .track:hover,
	.discogs-album .tracks .track:focus {
		background-color: var(--dark-grey-2) !important;
	}

	.api-result .bottom-row img,
	.discogs-album .bottom-row img {
		filter: invert(100%);
	}

	.label,
	p,
	strong {
		color: var(--light-grey-2);
	}
}

.import-album-modal {
	.modal-card-title {
		text-align: center;
		margin-left: 24px;
	}

	.modal-card {
		width: 100%;
		height: 100%;

		.modal-card-body {
			padding: 16px;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: space-evenly;
		}

		.modal-card-foot {
			.button {
				margin: 0;
				&:not(:first-of-type) {
					margin-left: 5px;
				}
			}

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

<style lang="less" scoped>
.break {
	flex-basis: 100%;
	height: 0;
	border: 1px solid var(--dark-grey);
	margin-top: 16px;
	margin-bottom: 16px;
}

.tabs-container {
	max-width: 376px;
	height: 100%;
	display: flex;
	flex-direction: column;
	flex-grow: 1;

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
		border-radius: 0 0 @border-radius @border-radius;
		padding: 15px;
		height: calc(100% - 32px);
		overflow: auto;
	}
}

.tabs-container.discogs-container {
	--primary-color: var(--purple);

	.search-discogs-album {
		background-color: var(--light-grey);
		border: 1px rgba(143, 40, 140, 0.75) solid;
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
				margin-bottom: 8px;
			}
		}

		.api-result {
			background-color: var(--white);
			border: 0.5px solid var(--primary-color);
			border-radius: @border-radius;
			margin-bottom: 16px;
		}

		button {
			margin: 5px 0;

			&:focus,
			&:hover {
				filter: contrast(0.75);
			}
		}

		.tracks {
			margin-top: 12px;

			.track:first-child {
				margin-top: 0;
				border-radius: @border-radius @border-radius 0 0;
			}

			.track:last-child {
				border-radius: 0 0 @border-radius @border-radius;
			}

			.track {
				border: 0.5px solid var(--black);
				margin-top: -1px;
				line-height: 16px;
				display: flex;

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
		}

		.discogs-load-more {
			margin-bottom: 8px;
		}
	}

	.discogs-album {
		background-color: var(--light-grey);
		border: 1px rgba(143, 40, 140, 0.75) solid;

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

			.tracks {
				margin-top: 12px;

				.track:first-child {
					margin-top: 0;
					border-radius: @border-radius @border-radius 0 0;
				}

				.track:last-child {
					border-radius: 0 0 @border-radius @border-radius;
				}

				.track {
					border: 0.5px solid var(--black);
					margin-top: -1px;
					line-height: 16px;
					display: flex;

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
		}
	}
}

.import-youtube-playlist {
	width: 376px;
	background-color: var(--light-grey);
	border: 1px rgba(163, 224, 255, 0.75) solid;
	border-radius: @border-radius;
	padding: 16px;
	overflow: auto;
	height: 100%;

	button {
		margin: 5px 0;
	}
}

.track-boxes {
	width: 376px;
	background-color: var(--light-grey);
	border: 1px rgba(163, 224, 255, 0.75) solid;
	border-radius: @border-radius;
	padding: 16px;
	overflow: auto;
	height: 100%;

	.track-box:first-child {
		margin-top: 0;
		border-radius: @border-radius @border-radius 0 0;
	}

	.track-box:last-child {
		border-radius: 0 0 @border-radius @border-radius;
	}

	.track-box {
		border: 0.5px solid var(--black);
		margin-top: -1px;
		line-height: 16px;
		display: flex;
		flex-flow: column;

		.track-position-title {
			display: flex;

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

		.track-box-songs-drag-area {
			flex: 1;
			min-height: 100px;
		}
	}
}
</style>
