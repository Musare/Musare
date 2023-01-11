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
const currentConvertType = ref("artist");
const sortBy = ref("track_count_des");

const spotifyArtists = ref({});

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

const toggleSpotifyArtistExpanded = spotifyArtistId => {
	spotifyArtists.value[spotifyArtistId].expanded =
		!spotifyArtists.value[spotifyArtistId].expanded;
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
				<p>Sorting by {{ sortBy }}</p>

				<br />

				<div class="column-headers">
					<div class="spotify-column-header column-header">
						<h3>Spotify</h3>
					</div>
					<div class="soumdcloud-column-header column-header">
						<h3>Soundcloud</h3>
					</div>
				</div>

				<div class="artists">
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
				</div>
			</template>
		</modal>
	</div>
</template>

<style lang="less" scoped>
.column-headers {
	display: flex;
	flex-direction: row;

	.column-header {
		flex: 1;
	}
}

.artists {
	display: flex;
	flex-direction: column;

	.artist-item {
		display: flex;
		flex-direction: column;
		row-gap: 8px;
		box-shadow: inset 0px 0px 1px white;
		width: 50%;

		position: relative;

		.spotify-section {
			display: flex;
			flex-direction: column;
			row-gap: 8px;
			padding: 8px 12px;

			.spotify-songs {
				display: flex;
				flex-direction: column;
				row-gap: 4px;
			}
		}

		.soundcloud-section {
			position: absolute;
			left: 100%;
			top: 0;
			width: 100%;
			height: 100%;
			overflow: hidden;
			box-shadow: inset 0px 0px 1px white;
			padding: 8px 12px;
		}
	}
}
</style>
