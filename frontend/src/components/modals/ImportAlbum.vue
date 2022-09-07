<script setup lang="ts">
import {
	defineAsyncComponent,
	ref,
	computed,
	onMounted,
	onBeforeUnmount
} from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { DraggableList } from "vue-draggable-list";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { useImportAlbumStore } from "@/stores/importAlbum";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const SongItem = defineAsyncComponent(
	() => import("@/components/SongItem.vue")
);

const props = defineProps({
	modalUuid: { type: String, default: "" }
});

const { socket } = useWebsocketsStore();

const importAlbumStore = useImportAlbumStore(props);
const { discogsTab, discogsAlbum, prefillDiscogs, playlistSongs } =
	storeToRefs(importAlbumStore);
const {
	toggleDiscogsAlbum,
	setPlaylistSongs,
	updatePlaylistSongs,
	selectDiscogsAlbum,
	resetPlaylistSongs,
	updatePlaylistSong
} = importAlbumStore;

const { openModal } = useModalsStore();

const isImportingPlaylist = ref(false);
const trackSongs = ref([]);
const songsToEdit = ref([]);
const search = ref({
	playlist: {
		query: ""
	}
});
const discogsQuery = ref("");
const discogs = ref({
	apiResults: [],
	page: 1,
	pages: 1,
	disableLoadMore: false
});
const discogsTabs = ref([]);

// TODO might not not be needed anymore, might be able to directly edit prefillDiscogs
const localPrefillDiscogs = computed({
	get: () => importAlbumStore.prefillDiscogs,
	set: value => {
		importAlbumStore.updatePrefillDiscogs(value);
	}
});

const showDiscogsTab = tab => {
	if (discogsTabs.value[`discogs-${tab}-tab`])
		discogsTabs.value[`discogs-${tab}-tab`].scrollIntoView({
			block: "nearest"
		});
	return importAlbumStore.showDiscogsTab(tab);
};

const init = () => {
	socket.dispatch("apis.joinRoom", "import-album");
};

const startEditingSongs = () => {
	songsToEdit.value = [];
	trackSongs.value.forEach((songs, index) => {
		songs.forEach(song => {
			const album = JSON.parse(JSON.stringify(discogsAlbum.value));
			album.track = album.tracks[index];
			delete album.tracks;
			delete album.expanded;
			delete album.gotMoreInfo;

			const songToEdit = <
				{
					youtubeId: string;
					prefill: {
						discogs: typeof album;
						title?: string;
						thumbnail?: string;
						genres?: string[];
						artists?: string[];
					};
				}
			>{
				youtubeId: song.youtubeId,
				prefill: {
					discogs: album
				}
			};

			if (prefillDiscogs.value) {
				songToEdit.prefill.title = album.track.title;
				songToEdit.prefill.thumbnail =
					discogsAlbum.value.album.albumArt;
				songToEdit.prefill.genres = JSON.parse(
					JSON.stringify(album.album.genres)
				);
				songToEdit.prefill.artists = JSON.parse(
					JSON.stringify(album.album.artists)
				);
			}

			songsToEdit.value.push(songToEdit);
		});
	});

	if (songsToEdit.value.length === 0) new Toast("You can't edit 0 songs.");
	else {
		openModal({
			modal: "editSong",
			data: { songs: songsToEdit.value }
		});
	}
};

const tryToAutoMove = () => {
	const { tracks } = discogsAlbum.value;
	const songs = JSON.parse(JSON.stringify(playlistSongs.value));

	tracks.forEach((track, index) => {
		songs.forEach(playlistSong => {
			if (
				playlistSong.title
					.toLowerCase()
					.trim()
					.indexOf(track.title.toLowerCase().trim()) !== -1
			) {
				songs.splice(songs.indexOf(playlistSong), 1);
				trackSongs.value[index].push(playlistSong);
			}
		});
	});

	updatePlaylistSongs(songs);
};

const importPlaylist = () => {
	if (isImportingPlaylist.value)
		return new Toast("A playlist is already importing.");
	isImportingPlaylist.value = true;

	// import query is blank
	if (!search.value.playlist.query)
		return new Toast("Please enter a YouTube playlist URL.");

	const regex = /[\\?&]list=([^&#]*)/;
	const splitQuery = regex.exec(search.value.playlist.query);

	if (!splitQuery) {
		return new Toast({
			content: "Please enter a valid YouTube playlist URL.",
			timeout: 4000
		});
	}

	// don't give starting import message instantly in case of instant error
	setTimeout(() => {
		if (isImportingPlaylist.value) {
			new Toast(
				"Starting to import your playlist. This can take some time to do."
			);
		}
	}, 750);

	return socket.dispatch(
		"youtube.requestSet",
		search.value.playlist.query,
		false,
		true,
		res => {
			isImportingPlaylist.value = false;
			const youtubeIds = res.videos.map(video => video.youtubeId);

			socket.dispatch("songs.getSongsFromYoutubeIds", youtubeIds, res => {
				if (res.status === "success") {
					const songs = res.data.songs.filter(song => !song.verified);
					const songsAlreadyVerified =
						res.data.songs.length - songs.length;
					setPlaylistSongs(songs);
					if (discogsAlbum.value.tracks) {
						trackSongs.value = discogsAlbum.value.tracks.map(
							() => []
						);
						tryToAutoMove();
					}
					if (songsAlreadyVerified > 0)
						new Toast(
							`${songsAlreadyVerified} songs were already verified, skipping those.`
						);
				}
				new Toast("Could not get songs.");
			});

			return new Toast({ content: res.message, timeout: 20000 });
		}
	);
};

const resetTrackSongs = () => {
	resetPlaylistSongs();
	trackSongs.value = discogsAlbum.value.tracks.map(() => []);
};

const selectAlbum = result => {
	selectDiscogsAlbum(result);
	trackSongs.value = discogsAlbum.value.tracks.map(() => []);
	if (playlistSongs.value.length > 0) tryToAutoMove();
	// clearDiscogsResults();
	showDiscogsTab("selected");
};

const toggleAPIResult = index => {
	const apiResult = discogs.value.apiResults[index];
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
};

const clearDiscogsResults = () => {
	discogs.value.apiResults = [];
	discogs.value.page = 1;
	discogs.value.pages = 1;
	discogs.value.disableLoadMore = false;
};

const searchDiscogsForPage = page => {
	const query = discogsQuery.value;

	socket.dispatch("apis.searchDiscogs", query, page, res => {
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
				discogs.value.apiResults = [];
			}

			discogs.value.pages = res.data.pages;

			discogs.value.apiResults = discogs.value.apiResults.concat(
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

			discogs.value.page = page;
			discogs.value.disableLoadMore = false;
		} else new Toast(res.message);
	});
};

const loadNextDiscogsPage = () => {
	discogs.value.disableLoadMore = true;
	searchDiscogsForPage(discogs.value.page + 1);
};

const onDiscogsQueryChange = () => {
	discogs.value.page = 1;
	discogs.value.pages = 1;
	discogs.value.apiResults = [];
	discogs.value.disableLoadMore = false;
};

const updateTrackSong = updatedSong => {
	updatePlaylistSong(updatedSong);
	trackSongs.value.forEach((songs, indexA) => {
		songs.forEach((song, indexB) => {
			if (song._id === updatedSong._id)
				trackSongs.value[indexA][indexB] = updatedSong;
		});
	});
};

onMounted(() => {
	socket.onConnect(init);

	socket.on("event:admin.song.updated", res => {
		updateTrackSong(res.data.song);
	});
});

onBeforeUnmount(() => {
	selectDiscogsAlbum({});
	setPlaylistSongs([]);
	showDiscogsTab("search");
	socket.dispatch("apis.leaveRoom", "import-album");
	// Delete the Pinia store that was created for this modal, after all other cleanup tasks are performed
	importAlbumStore.$dispose();
});
</script>

<template>
	<div>
		<modal title="Import Album" class="import-album-modal" size="wide">
			<template #body>
				<div class="tabs-container discogs-container">
					<div class="tab-selection">
						<button
							class="button is-default"
							:class="{ selected: discogsTab === 'search' }"
							:ref="
								el => (discogsTabs['discogs-search-tab'] = el)
							"
							@click="showDiscogsTab('search')"
						>
							Search
						</button>
						<button
							v-if="discogsAlbum && discogsAlbum.album"
							class="button is-default"
							:class="{ selected: discogsTab === 'selected' }"
							:ref="
								el => (discogsTabs['discogs-selected-tab'] = el)
							"
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
					<draggable-list
						v-if="playlistSongs.length > 0"
						v-model:list="playlistSongs"
						item-key="_id"
						:group="`import-album-${modalUuid}-songs`"
					>
						<template #item="{ element }">
							<song-item
								:key="`playlist-song-${element._id}`"
								:song="element"
							>
							</song-item>
						</template>
					</draggable-list>
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
						<!-- :data-track-index="index" -->
						<div class="track-box-songs-drag-area">
							<draggable-list
								v-model:list="trackSongs[index]"
								item-key="_id"
								:group="`import-album-${modalUuid}-songs`"
							>
								<template #item="{ element }">
									<song-item
										:key="`track-song-${element._id}`"
										:song="element"
									>
									</song-item>
								</template>
							</draggable-list>
						</div>
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
			display: flex;
			flex-direction: column;
		}
	}
}
</style>
