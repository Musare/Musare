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

const getAlternativeMediaSourcesForTrack = mediaSource => {
	socket.dispatch(
		"apis.getAlternativeMediaSourcesForTrack",
		mediaSource,
		res => {
			console.log("KRIS111133", res);
			if (res.status === "success") {
				AlternativeSourcesForTrackMap.value.set(mediaSource, res.data);
				// ISRCMap.value.set(ISRC, res.data);
				// WikidataMusicBrainzWorkMap.value.set(workId, res.data.response);
			}
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
							<p>Media source: {{ spotifyTrackMediaSource }}</p>
							<p>
								Name:
								{{
									allSongs[spotifyTrackMediaSource].track.name
								}}
							</p>
							<p>Artists:</p>
							<ul>
								<li
									v-for="artist in allSongs[
										spotifyTrackMediaSource
									].track.artists"
									:key="artist"
								>
									- {{ artist }}
								</li>
							</ul>
							<p>
								Duration:
								{{
									allSongs[spotifyTrackMediaSource].track
										.duration
								}}
							</p>
							<p>
								ISRC:
								{{
									allSongs[spotifyTrackMediaSource].track
										.externalIds.isrc
								}}
							</p>
						</div>
						<div class="right">
							<button
								class="button"
								@click="
									getAlternativeMediaSourcesForTrack(
										spotifyTrackMediaSource
									)
								"
							>
								Get alternative media sources
							</button>
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
.tracks {
	display: flex;
	flex-direction: column;

	.track-row {
		.left,
		.right {
			padding: 8px;
			width: 50%;
			box-shadow: inset 0px 0px 1px white;
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
