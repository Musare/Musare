<script setup lang="ts">
import {
	defineProps,
	defineAsyncComponent,
	onMounted,
	ref,
	computed
} from "vue";
import Toast from "toasters";
import { useModalsStore } from "@/stores/modals";
import { useWebsocketsStore } from "@/stores/websockets";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));

const SongItem = defineAsyncComponent(
	() => import("@/components/SongItem.vue")
);

const { openModal, closeCurrentModal } = useModalsStore();
const { socket } = useWebsocketsStore();

const TAG = "CSS";

const props = defineProps({
	modalUuid: { type: String, required: true },
	playlistId: { type: String, default: null }
});

const playlist = ref(null);
const allSongs = ref(null);
const loaded = ref(false);
const currentConvertType = ref("track");
const sortBy = ref("track_count_des");

const spotifyArtists = ref({});
const alternativeSongsMap = ref(new Map());

const showExtra = ref(false);

const preferTopic = ref(true);
const singleMode = ref(true);

// const ISRCMap = ref(new Map());
// const WikidataSpotifyTrackMap = ref(new Map());
// const WikidataMusicBrainzWorkMap = ref(new Map());
const AlternativeSourcesForTrackMap = ref(new Map());

const spotifyArtistsArray = computed(() =>
	Object.entries(spotifyArtists.value)
		.map(([spotifyArtistId, spotifyArtist]) => ({
			artistId: spotifyArtistId,
			...spotifyArtist
		}))
		.sort((a, b) => {
			if (sortBy.value === "track_count_des")
				return b.songs.length - a.songs.length;
			if (sortBy.value === "track_count_asc")
				return a.songs.length - b.songs.length;
		})
);

const spotifyTracksMediaSourcesArray = computed(() =>
	Object.keys(allSongs.value)
);

const toggleSpotifyArtistExpanded = spotifyArtistId => {
	spotifyArtists.value[spotifyArtistId].expanded =
		!spotifyArtists.value[spotifyArtistId].expanded;
};

// const getFromISRC = ISRC => {
// 	socket.dispatch("apis.searchMusicBrainzISRC", ISRC, res => {
// 		console.log("KRIS111", res);
// 		if (res.status === "success") {
// 			// ISRCMap.value.set(ISRC, res.data);
// 			ISRCMap.value.set(ISRC, res.data.response);
// 		}
// 	});
// };

// const getFromWikidataSpotifyTrack = trackId => {
// 	socket.dispatch("apis.searchWikidataBySpotifyTrackId", trackId, res => {
// 		console.log("KRIS11111", res);
// 		if (res.status === "success") {
// 			// ISRCMap.value.set(ISRC, res.data);
// 			WikidataSpotifyTrackMap.value.set(trackId, res.data.response);
// 		}
// 	});
// };

// const getFromWikidataByMusicBrainzWorkId = workId => {
// 	socket.dispatch("apis.searchWikidataByMusicBrainzWorkId", workId, res => {
// 		console.log("KRIS111112", res);
// 		if (res.status === "success") {
// 			// ISRCMap.value.set(ISRC, res.data);
// 			WikidataMusicBrainzWorkMap.value.set(workId, res.data.response);
// 		}
// 	});
// };

const gettingAlternativeMediaSources = ref(false);

const getAlternativeMediaSourcesForTracks = () => {
	if (gettingAlternativeMediaSources.value) return;
	gettingAlternativeMediaSources.value = true;

	const mediaSources = spotifyTracksMediaSourcesArray.value;

	socket.dispatch("apis.getAlternativeMediaSourcesForTracks", mediaSources, {
		cb: res => {
			console.log("KRIS111133", res);
			// console.log("Change state to loading");
			// if (res.status === "success") {
			// 	AlternativeSourcesForTrackMap.value.set(
			// 		mediaSource,
			// 		res.data.alternativeMediaSources
			// 	);
			// 	console.log(32211, AlternativeSourcesForTrackMap.value);
			// 	getMissingAlternativeSongs();
			// 	// ISRCMap.value.set(ISRC, res.data);
			// 	// WikidataMusicBrainzWorkMap.value.set(workId, res.data.response);
			// }
		},
		onProgress: data => {
			console.log("KRIS595959", data);
			if (data.status === "working") {
				if (data.data.status === "success") {
					const { mediaSource, result } = data.data;
					AlternativeSourcesForTrackMap.value.set(
						mediaSource,
						result
					);
					console.log(32211, AlternativeSourcesForTrackMap.value);
					getMissingAlternativeSongs();
					// ISRCMap.value.set(ISRC, res.data);
					// WikidataMusicBrainzWorkMap.value.set(workId, res.data.response);
				}
			}
		}
	});
};

const loadingMediaSourcesMap = ref(new Map());
const failedToLoadMediaSourcesMap = ref(new Map());

const gettingMissingAlternativeSongs = ref(false);
const getMissingAlternativeSongsAfterAgain = ref(false);

const getMissingAlternativeSongs = () => {
	if (gettingMissingAlternativeSongs.value) {
		getMissingAlternativeSongsAfterAgain.value = true;
		return;
	}
	getMissingAlternativeSongsAfterAgain.value = false;
	gettingMissingAlternativeSongs.value = true;

	const allAlternativeMediaSources = Array.from(
		new Set(
			Array.from(AlternativeSourcesForTrackMap.value.values())
				.filter(t => !!t)
				.map(t => t.mediaSources)
				.flat()
		)
	);
	const filteredMediaSources = allAlternativeMediaSources.filter(
		mediaSource => {
			const alreadyExists = alternativeSongsMap.value.has(mediaSource);
			if (alreadyExists) return false;
			const loading = loadingMediaSourcesMap.value.get(mediaSource);
			if (loading) return false;
			const failedToLoad =
				failedToLoadMediaSourcesMap.value.get(mediaSource);
			if (failedToLoad) return false;
			return true;
		}
	);
	filteredMediaSources.forEach(mediaSource => {
		loadingMediaSourcesMap.value.set(mediaSource, true);
	});

	socket.dispatch(
		"media.getMediaFromMediaSources",
		filteredMediaSources,
		res => {
			if (res.status === "success") {
				const { songMap } = res.data;
				filteredMediaSources.forEach(mediaSource => {
					if (songMap[mediaSource]) {
						alternativeSongsMap.value.set(
							mediaSource,
							songMap[mediaSource]
						);
					} else {
						failedToLoadMediaSourcesMap.value.set(
							mediaSource,
							true
						);
					}
					loadingMediaSourcesMap.value.delete(mediaSource);
				});

				if (getMissingAlternativeSongsAfterAgain.value) {
					setTimeout(() => {
						gettingMissingAlternativeSongs.value = false;
						getMissingAlternativeSongs();
					}, 500);
				}
				// console.log(657567, );
				// AlternativeSourcesForTrackMap.value.set(
				// 	mediaSource,
				// 	res.data.alternativeMediaSources
				// );
				// console.log(32211, AlternativeSourcesForTrackMap.value);
				// ISRCMap.value.set(ISRC, res.data);
				// WikidataMusicBrainzWorkMap.value.set(workId, res.data.response);
			}
		}
	);
};

const replaceSong = (oldMediaSource, newMediaSource) => {
	socket.dispatch(
		"playlists.replaceSongInPlaylist",
		oldMediaSource,
		newMediaSource,
		props.playlistId,
		res => {
			console.log("KRISWOWOWOW", res);
		}
	);
};

onMounted(() => {
	console.debug(TAG, "On mounted start");

	console.debug(TAG, "Getting playlist", props);
	socket.dispatch("playlists.getPlaylist", props.playlistId, res => {
		console.debug(TAG, "Get playlist response", res);

		if (res.status !== "success") {
			new Toast(res.message);
			closeCurrentModal();
			return;
		}

		playlist.value = res.data.playlist;
		allSongs.value = {};

		playlist.value.songs
			.filter(song => song.mediaSource.startsWith("spotify:"))
			.forEach(song => {
				allSongs.value[song.mediaSource] = {
					song,
					track: null
				};
			});

		const mediaSources = Object.keys(allSongs.value);

		console.debug(TAG, "getTracksFromMediaSources start", mediaSources);
		socket.dispatch(
			"spotify.getTracksFromMediaSources",
			mediaSources,
			res => {
				console.debug(TAG, "getTracksFromMediaSources response", res);
				if (res.status !== "success") {
					new Toast(res.message);
					closeCurrentModal();
					return;
				}

				const { tracks } = res.data;

				Object.entries(tracks).forEach(([mediaSource, track]) => {
					allSongs.value[mediaSource].track = track;

					track.artistIds.forEach((artistId, artistIndex) => {
						if (!spotifyArtists.value[artistId]) {
							spotifyArtists.value[artistId] = {
								name: track.artists[artistIndex],
								songs: [mediaSource],
								expanded: false
							};
						} else
							spotifyArtists.value[artistId].songs.push(
								mediaSource
							);
					});
				});

				loaded.value = true;
			}
		);
	});

	console.debug(TAG, "On mounted end");
});
</script>

<template>
	<div>
		<modal
			title="Convert Spotify Songs"
			class="convert-spotify-songs-modal"
			size="wide"
			@closed="closeCurrentModal()"
		>
			<template #body>
				<p>Converting by {{ currentConvertType }}</p>
				<button
					class="button is-primary"
					@click="showExtra = !showExtra"
				>
					Toggle show extra
				</button>
				<br />
				<button
					class="button is-primary"
					@click="preferTopic = !preferTopic"
				>
					Prefer mode:
					{{ preferTopic ? "first topic" : "first song" }}
				</button>
				<br />
				<button
					class="button is-primary"
					@click="getAlternativeMediaSourcesForTracks()"
				>
					Get alternatives
				</button>
				<br />
				<button
					class="button is-primary"
					@click="singleMode = !singleMode"
				>
					Single convert mode: {{ singleMode }}
				</button>
				<br />
				<button
					class="button is-primary"
					@click="convertAllTracks()"
					v-if="!singleMode"
				>
					Use prefer mode to convert all available tracks
				</button>
				<!-- <p>Sorting by {{ sortBy }}</p> -->

				<br />

				<!-- <div class="column-headers">
					<div class="spotify-column-header column-header">
						<h3>Spotify</h3>
					</div>
					<div class="soumdcloud-column-header column-header">
						<h3>Soundcloud</h3>
					</div>
				</div> -->

				<div class="tracks" v-if="currentConvertType === 'track'">
					<div
						class="track-row"
						v-for="spotifyTrackMediaSource in spotifyTracksMediaSourcesArray"
						:key="spotifyTrackMediaSource"
					>
						<div class="left">
							<song-item
								:song="{
									title: allSongs[spotifyTrackMediaSource]
										.track.name,
									duration:
										allSongs[spotifyTrackMediaSource].track
											.duration,
									artists:
										allSongs[spotifyTrackMediaSource].track
											.artists,
									thumbnail:
										allSongs[spotifyTrackMediaSource].track
											.albumImageUrl
								}"
							>
								<template #leftIcon>
									<a
										:href="`https://open.spotify.com/track/${
											spotifyTrackMediaSource.split(
												':'
											)[1]
										}`"
										target="_blank"
									>
										<div
											class="spotify-icon left-icon"
										></div>
									</a>
								</template>
							</song-item>
							<p>Media source: {{ spotifyTrackMediaSource }}</p>
							<p>
								ISRC:
								{{
									allSongs[spotifyTrackMediaSource].track
										.externalIds.isrc
								}}
							</p>
						</div>
						<div class="right">
							<p
								v-if="
									!AlternativeSourcesForTrackMap.has(
										spotifyTrackMediaSource
									)
								"
							>
								Track not converted yet
							</p>
							<template v-else>
								<div
									v-for="[
										alternativeMediaSource,
										alternativeMediaSourceOrigins
									] in Object.entries(
										AlternativeSourcesForTrackMap.get(
											spotifyTrackMediaSource
										).mediaSourcesOrigins
									)"
									:key="alternativeMediaSource"
								>
									<p
										v-if="
											loadingMediaSourcesMap.has(
												alternativeMediaSource
											)
										"
									>
										Song {{ alternativeMediaSource }} is
										loading
									</p>
									<p
										v-else-if="
											failedToLoadMediaSourcesMap.has(
												alternativeMediaSource
											)
										"
									>
										Song {{ alternativeMediaSource }} failed
										to load
									</p>
									<p
										v-else-if="
											!alternativeSongsMap.has(
												alternativeMediaSource
											)
										"
									>
										Song {{ alternativeMediaSource }} not
										loaded/found
									</p>
									<template v-else>
										<song-item
											:song="
												alternativeSongsMap.get(
													alternativeMediaSource
												)
											"
										>
											<template #leftIcon>
												<a
													v-if="
														alternativeMediaSource.split(
															':'
														)[0] === 'youtube'
													"
													:href="`https://youtu.be/${
														alternativeMediaSource.split(
															':'
														)[1]
													}`"
													target="_blank"
												>
													<div
														class="youtube-icon left-icon"
													></div>
												</a>
												<a
													v-if="
														alternativeMediaSource.split(
															':'
														)[0] === 'soundcloud'
													"
													target="_blank"
												>
													<div
														class="soundcloud-icon left-icon"
													></div>
												</a>
											</template>
										</song-item>
										<button
											class="button is-primary"
											v-if="singleMode"
											@click="
												replaceSong(
													spotifyTrackMediaSource,
													alternativeMediaSource
												)
											"
										>
											Convert to this song
										</button>
									</template>

									<ul v-if="showExtra">
										<li
											v-for="origin in alternativeMediaSourceOrigins"
											:key="
												spotifyTrackMediaSource +
												alternativeMediaSource +
												origin
											"
										>
											=
											<ul>
												<li
													v-for="originItem in origin"
													:key="
														spotifyTrackMediaSource +
														alternativeMediaSource +
														origin +
														originItem
													"
												>
													+ {{ originItem }}
												</li>
											</ul>
										</li>
									</ul>
								</div>
							</template>
							<!-- <button
								class="button"
								v-if="
									!ISRCMap.has(
										allSongs[spotifyTrackMediaSource].track
											.externalIds.isrc
									)
								"
								@click="
									getFromISRC(
										allSongs[spotifyTrackMediaSource].track
											.externalIds.isrc
									)
								"
							>
								Get MusicBrainz ISRC data
							</button>
							<div v-else>
								<p>Recording URL's</p>
								<ul>
									<li
										v-for="recordingUrl in ISRCMap.get(
											allSongs[spotifyTrackMediaSource]
												.track.externalIds.isrc
										).recordingUrls"
										:key="recordingUrl"
									>
										{{ recordingUrl }}
									</li>
								</ul>
								<hr />
								<p>Work ID's</p>
								<ul>
									<li
										v-for="workId in ISRCMap.get(
											allSongs[spotifyTrackMediaSource]
												.track.externalIds.isrc
										).workIds"
										:key="workId"
									>
										<p>{{ workId }}</p>
										<button
											v-if="
												!WikidataMusicBrainzWorkMap.has(
													workId
												)
											"
											@click="
												getFromWikidataByMusicBrainzWorkId(
													workId
												)
											"
											class="button"
										>
											Get WikiData data
										</button>
										<div v-else>
											<p>YouTube ID's</p>
											<ul>
												<li
													v-for="youtubeId in WikidataMusicBrainzWorkMap.get(
														workId
													).youtubeIds"
												>
													{{ youtubeId }}
												</li>
											</ul>
										</div>
									</li>
								</ul>
							</div>
							<hr />
							<button
								class="button"
								v-if="
									!WikidataSpotifyTrackMap.has(
										allSongs[spotifyTrackMediaSource].track
											.trackId
									)
								"
								@click="
									getFromWikidataSpotifyTrack(
										allSongs[spotifyTrackMediaSource].track
											.trackId
									)
								"
							>
								Get WikiData Spotify track data
							</button> -->
						</div>
					</div>
				</div>

				<!-- <div class="artists">
					<div
						v-for="spotifyArtist in spotifyArtistsArray"
						:key="spotifyArtist.artistId"
						class="artist-item"
					>
						<div class="spotify-section">
							<p
								@click="
									toggleSpotifyArtistExpanded(
										spotifyArtist.artistId
									)
								"
							>
								{{ spotifyArtist.name }} ({{
									spotifyArtist.songs.length
								}}
								songs)
							</p>

							<div
								class="spotify-songs"
								v-if="spotifyArtist.expanded"
							>
								<div
									v-for="mediaSource in spotifyArtist.songs"
									:key="`${spotifyArtist.artistId}-${mediaSource}`"
									class="spotify-song"
								>
									<song-item
										:song="{
											title: allSongs[mediaSource].track
												.name,
											duration:
												allSongs[mediaSource].track
													.duration,
											artists:
												allSongs[mediaSource].track
													.artists,
											thumbnail:
												allSongs[mediaSource].track
													.albumImageUrl
										}"
										:disabled-actions="[
											'youtube',
											'report',
											'addToPlaylist',
											'edit'
										]"
									></song-item>
								</div>
							</div>
						</div>
						<div class="soundcloud-section">
							<p>Not found</p>
							<div v-if="spotifyArtist.expanded">
								<button class="button">Get artist</button>
							</div>
						</div>
					</div>
				</div> -->
			</template>
		</modal>
	</div>
</template>

<style lang="less" scoped>
:deep(.song-item) {
	.left-icon {
		cursor: pointer;
	}
}

.tracks {
	display: flex;
	flex-direction: column;

	.track-row {
		.left,
		.right {
			padding: 8px;
			width: 50%;
			box-shadow: inset 0px 0px 1px white;
			display: flex;
			flex-direction: column;
			row-gap: 8px;
		}
	}
}

// .column-headers {
// 	display: flex;
// 	flex-direction: row;

// 	.column-header {
// 		flex: 1;
// 	}
// }

// .artists {
// 	display: flex;
// 	flex-direction: column;

// 	.artist-item {
// 		display: flex;
// 		flex-direction: column;
// 		row-gap: 8px;
// 		box-shadow: inset 0px 0px 1px white;
// 		width: 50%;

// 		position: relative;

// 		.spotify-section {
// 			display: flex;
// 			flex-direction: column;
// 			row-gap: 8px;
// 			padding: 8px 12px;

// 			.spotify-songs {
// 				display: flex;
// 				flex-direction: column;
// 				row-gap: 4px;
// 			}
// 		}

// 		.soundcloud-section {
// 			position: absolute;
// 			left: 100%;
// 			top: 0;
// 			width: 100%;
// 			height: 100%;
// 			overflow: hidden;
// 			box-shadow: inset 0px 0px 1px white;
// 			padding: 8px 12px;
// 		}
// 	}
// }
</style>
