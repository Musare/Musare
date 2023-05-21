<script setup lang="ts">
import {
	defineAsyncComponent,
	reactive,
	onMounted,
	onBeforeUnmount
} from "vue";

import { useYoutubeChannel } from "@/composables/useYoutubeChannel";
import { useSoundcloudArtist } from "@/composables/useSoundcloudArtist";
import { useSpotifyArtist } from "@/composables/useSpotifyArtist";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const ArtistItem = defineAsyncComponent(
	() => import("@/components/ArtistItem.vue")
);

defineProps({
	modalUuid: { type: String, required: true }
});

const { youtubeChannelURLOrID, getYoutubeChannel, getYoutubeChannelVideos } =
	useYoutubeChannel();
const {
	soundcloudArtistURLOrPermalink,
	getSoundcloudArtist,
	getSoundcloudArtistTracks
} = useSoundcloudArtist();
const { spotifyArtistURLOrID, getSpotifyArtist } = useSpotifyArtist();

const youtubeChannels = reactive([]);
const soundcloudArtists = reactive([]);
const spotifyArtists = reactive([]);

const selectYoutubeChannel = async () => {
	const youtubeChannel = await getYoutubeChannel();
	youtubeChannels.push(youtubeChannel);
};

const selectSoundcloudArtist = async () => {
	const soundcloudArtist = await getSoundcloudArtist();
	soundcloudArtists.push(soundcloudArtist);
};

const selectSpotifyArtist = async () => {
	const spotifyArtist = await getSpotifyArtist();
	spotifyArtists.push(spotifyArtist);
};

const songs = reactive([]);

const importSongs = async () => {
	console.log(32111);
	const promises = [];
	youtubeChannels.forEach(youtubeChannel => {
		promises.push(async () => {
			const videos = await getYoutubeChannelVideos(
				youtubeChannel.channelId
			);
			console.log(321, videos);
			videos.forEach(video => {
				songs.push({ ...video, type: "youtube" });
			});
		});
	});
	soundcloudArtists.forEach(soundcloudArtist => {
		promises.push(
			new Promise<void>(resolve => {
				console.log(555, soundcloudArtist);
				getSoundcloudArtistTracks(soundcloudArtist.artistId)
					.then(tracks => {
						console.log(123, tracks);
						tracks.forEach(track => {
							songs.push({ ...track, type: "soundcloud" });
						});
					})
					.finally(() => {
						resolve();
					});
			})
		);
	});

	console.log(promises.length);

	await Promise.allSettled(promises);
};

onMounted(() => {
	// localSpotifyTracks.value = props.spotifyTracks;
	// if (props.youtubePlaylistId) importPlaylist();
	// else if (props.youtubeChannelUrl) importChannel();
});

onBeforeUnmount(() => {});
</script>

<template>
	<div>
		<modal title="Import artist" class="import-artist-modal" size="wide">
			<template #body>
				<main>
					<div class="artist-row">
						<div class="artist-source-container">
							<label class="label"
								>YouTube channel URL or ID</label
							>
							<p class="control is-grouped">
								<span class="control is-expanded">
									<input
										v-model="youtubeChannelURLOrID"
										class="input"
										type="text"
										placeholder="Enter YouTube channel URL or ID..."
										@keyup.enter="selectYoutubeChannel()"
									/>
								</span>
								<span class="control">
									<a
										class="button is-info"
										@click="selectYoutubeChannel()"
										>Select</a
									>
								</span>
							</p>
							<label class="label"
								>Soundcloud artist URL or permalink</label
							>
							<p class="control is-grouped">
								<span class="control is-expanded">
									<input
										v-model="soundcloudArtistURLOrPermalink"
										class="input"
										type="text"
										placeholder="Enter Soundcloud channel URL or permalink..."
										@keyup.enter="selectSoundcloudArtist()"
									/>
								</span>
								<span class="control">
									<a
										class="button is-info"
										@click="selectSoundcloudArtist()"
										>Select</a
									>
								</span>
							</p>
							<div
								class="youtube-channels"
								v-if="youtubeChannels.length > 0"
							>
								<artist-item
									v-for="youtubeChannel in youtubeChannels"
									:key="youtubeChannel.channelId"
									type="youtube"
									:data="youtubeChannel"
								>
								</artist-item>
							</div>
							<div
								class="soundcloud-artists"
								v-if="soundcloudArtists.length > 0"
							>
								<artist-item
									v-for="soundcloudArtist in soundcloudArtists"
									:key="soundcloudArtist.artistId"
									type="soundcloud"
									:data="soundcloudArtist"
								></artist-item>
							</div>
							<button @click="importSongs()">Import songs</button>
						</div>
						<div class="artist-data-container">
							<label class="label"
								>Spotify artist URL or ID</label
							>
							<p class="control is-grouped">
								<span class="control is-expanded">
									<input
										v-model="spotifyArtistURLOrID"
										class="input"
										type="text"
										placeholder="Enter Spotify channel URL or ID..."
										@keyup.enter="selectSpotifyArtist()"
									/>
								</span>
								<span class="control">
									<a
										class="button is-info"
										@click="selectSpotifyArtist()"
										>Select</a
									>
								</span>
							</p>
							<div
								class="spotify-artists"
								v-if="spotifyArtists.length > 0"
							>
								<artist-item
									v-for="spotifyArtist in spotifyArtists"
									:key="spotifyArtist.artistId"
									type="spotify"
									:data="spotifyArtist"
								></artist-item>
							</div>
						</div>
					</div>
					<div class="song-row">
						<div class="song-source-container">
							<!-- <div>
								Showing all songs / showing songs for channel X
							</div> -->
							<div class="song-source-settings">
								<label for="">Search</label>
								<input type="text" />
							</div>
							<div class="songs"></div>
						</div>
						<div class="song-data-container"></div>
					</div>
				</main>

				<!-- <div class="playlist-songs">
					<h4>YouTube songs</h4>
					<p v-if="isImportingPlaylist">Importing playlist...</p>
					<draggable-list
						v-if="playlistSongs.length > 0"
						v-model:list="playlistSongs"
						item-key="mediaSource"
						:group="`replace-spotify-album-${modalUuid}-songs`"
					>
						<template #item="{ element }">
							<media-item
								:key="`playlist-song-${element.mediaSource}`"
								:song="element"
							>
							</media-item>
						</template>
					</draggable-list>
				</div> -->
				<!-- <div class="track-boxes">
					<div
						class="track-box"
						v-for="(track, index) in localSpotifyTracks"
						:key="track.trackId"
					>
						<div class="track-position-title">
							<p>
								{{ track.name }} -
								{{ track.artists.join(", ") }}
							</p>
						</div>
						<div class="track-box-songs-drag-area">
							<draggable-list
								v-model:list="trackSongs[index]"
								item-key="mediaSource"
								:group="`replace-spotify-album-${modalUuid}-songs`"
							>
								<template #item="{ element }">
									<media-item
										:key="`track-song-${element.mediaSource}`"
										:song="element"
									>
									</media-item>
									<button
										class="button is-primary is-fullwidth"
										@click="
											replaceSpotifySong(
												`spotify:${track.trackId}`,
												element.mediaSource
											)
										"
									>
										Replace Spotify song with this song
									</button>
								</template>
							</draggable-list>
						</div>
					</div>
				</div> -->
			</template>
			<template #footer>
				<!-- <button class="button is-primary" @click="tryToAutoMove()">
					Try to auto move
				</button>
				<button
					class="button is-primary"
					@click="replaceAllSpotifySongs()"
				>
					Replace all songs
				</button> -->
			</template>
		</modal>
	</div>
</template>

<style lang="less">
// .night-mode {
// 	.spotify-album-container,
// 	.playlist-songs,
// 	.track-boxes {
// 		background-color: var(--dark-grey-3) !important;
// 		border: 0 !important;
// 		.tab {
// 			border: 0 !important;
// 		}
// 	}

// 	.api-result {
// 		background-color: var(--dark-grey-3) !important;
// 	}

// 	.api-result .tracks .track:hover,
// 	.api-result .tracks .track:focus,
// 	.discogs-album .tracks .track:hover,
// 	.discogs-album .tracks .track:focus {
// 		background-color: var(--dark-grey-2) !important;
// 	}

// 	.api-result .bottom-row img,
// 	.discogs-album .bottom-row img {
// 		filter: invert(100%);
// 	}

// 	.label,
// 	p,
// 	strong {
// 		color: var(--light-grey-2);
// 	}
// }

// .replace-spotify-songs-modal {
// 	.modal-card-title {
// 		text-align: center;
// 		margin-left: 24px;
// 	}

// 	.modal-card {
// 		width: 100%;
// 		height: 100%;

// 		.modal-card-body {
// 			padding: 16px;
// 			display: flex;
// 			flex-direction: row;
// 			flex-wrap: wrap;
// 			justify-content: space-evenly;
// 		}

// 		.modal-card-foot {
// 			.button {
// 				margin: 0;
// 				&:not(:first-of-type) {
// 					margin-left: 5px;
// 				}
// 			}

// 			div div {
// 				margin-right: 5px;
// 			}
// 			.right {
// 				display: flex;
// 				margin-left: auto;
// 				margin-right: 0;
// 			}
// 		}
// 	}
// }
//
</style>

//
<style lang="less" scoped>
main {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.artist-row,
.song-row {
	display: flex;
	gap: 8px;

	.artist-source-container,
	.artist-data-container,
	.song-source-container,
	.song-data-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		border: 1px solid white;
		padding: 8px;
		border-radius: 4px;
		gap: 8px;
	}
}

.youtube-channels {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

// .break {
// 	flex-basis: 100%;
// 	height: 0;
// 	border: 1px solid var(--dark-grey);
// 	margin-top: 16px;
// 	margin-bottom: 16px;
// }

// .spotify-album-container,
// .playlist-songs {
// 	width: 500px;
// 	background-color: var(--light-grey);
// 	border: 1px rgba(163, 224, 255, 0.75) solid;
// 	border-radius: @border-radius;
// 	padding: 16px;
// 	overflow: auto;
// 	height: 100%;

// 	h4 {
// 		margin: 0;
// 		margin-bottom: 16px;
// 	}

// 	button {
// 		margin: 5px 0;
// 	}
// }

// .track-boxes {
// 	width: 500px;
// 	background-color: var(--light-grey);
// 	border: 1px rgba(163, 224, 255, 0.75) solid;
// 	border-radius: @border-radius;
// 	padding: 16px;
// 	overflow: auto;
// 	height: 100%;

// 	.track-box:first-child {
// 		margin-top: 0;
// 		border-radius: @border-radius @border-radius 0 0;
// 	}

// 	.track-box:last-child {
// 		border-radius: 0 0 @border-radius @border-radius;
// 	}

// 	.track-box {
// 		border: 0.5px solid var(--black);
// 		margin-top: -1px;
// 		line-height: 16px;
// 		display: flex;
// 		flex-flow: column;

// 		.track-position-title {
// 			display: flex;

// 			span {
// 				font-weight: 600;
// 				display: inline-block;
// 				margin-top: 7px;
// 				margin-bottom: 7px;
// 				margin-left: 7px;
// 			}

// 			p {
// 				display: inline-block;
// 				margin: 7px;
// 				flex: 1;
// 			}
// 		}

// 		.track-box-songs-drag-area {
// 			flex: 1;
// 			min-height: 100px;
// 			display: flex;
// 			flex-direction: column;
// 		}
// 	}
// }
</style>
