<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted, onBeforeUnmount } from "vue";
import Toast from "toasters";
import { DraggableList } from "vue-draggable-list";
import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));
const SongItem = defineAsyncComponent(
	() => import("@/components/SongItem.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true },
	spotifyAlbum: { type: Object, default: () => ({}) },
	spotifyTracks: { type: Array, default: () => [] },
	playlistId: { type: String },
	youtubePlaylistId: { type: String },
	youtubeChannelUrl: { type: String }
});

const { socket } = useWebsocketsStore();

const { closeCurrentModal } = useModalsStore();

const isImportingPlaylist = ref(false);
const hasImportedPlaylist = ref(false);
const trackSongs = ref([]);

const playlistSongs = ref([]);

const localSpotifyTracks = ref([]);

const replacingAllSpotifySongs = ref(false);

const replaceAllSpotifySongs = async () => {
	if (replacingAllSpotifySongs.value) return;
	replacingAllSpotifySongs.value = true;

	const replaceArray = [];

	localSpotifyTracks.value.forEach((spotifyTrack, index) => {
		const spotifyMediaSource = `spotify:${spotifyTrack.trackId}`;

		if (trackSongs.value[index].length === 1) {
			const replacementMediaSource =
				trackSongs.value[index][0].mediaSource;

			if (!spotifyMediaSource || !replacementMediaSource) return;

			replaceArray.push([spotifyMediaSource, replacementMediaSource]);
		}
	});

	if (replaceArray.length === 0) {
		new Toast(
			"No songs can be replaced, please make sure each track has one song dragged into the box"
		);
		return;
	}

	const promises = replaceArray.map(
		([spotifyMediaSource, replacementMediaSource]) =>
			new Promise<void>(resolve => {
				socket.dispatch(
					"playlists.replaceSongInPlaylist",
					spotifyMediaSource,
					replacementMediaSource,
					props.playlistId,
					res => {
						console.log(
							"playlists.replaceSongInPlaylist response",
							res
						);

						if (res.status === "success") {
							const spotifyTrackId =
								spotifyMediaSource.split(":")[1];

							const trackIndex =
								localSpotifyTracks.value.findIndex(
									spotifyTrack =>
										spotifyTrack.trackId === spotifyTrackId
								);

							localSpotifyTracks.value.splice(trackIndex, 1);
							trackSongs.value.splice(trackIndex, 1);
						}

						resolve();
					}
				);
			})
	);

	Promise.allSettled(promises).finally(() => {
		replacingAllSpotifySongs.value = false;

		if (localSpotifyTracks.value.length === 0) closeCurrentModal();
	});
};

const replaceSpotifySong = (oldMediaSource, newMediaSource) => {
	socket.dispatch(
		"playlists.replaceSongInPlaylist",
		oldMediaSource,
		newMediaSource,
		props.playlistId,
		res => {
			console.log("playlists.replaceSongInPlaylist response", res);

			if (res.status === "success") {
				const spotifyTrackId = oldMediaSource.split(":")[1];

				const trackIndex = localSpotifyTracks.value.findIndex(
					spotifyTrack => spotifyTrack.trackId === spotifyTrackId
				);

				localSpotifyTracks.value.splice(trackIndex, 1);
				trackSongs.value.splice(trackIndex, 1);

				if (localSpotifyTracks.value.length === 0) closeCurrentModal();
			}
		}
	);
};

const tryToAutoMove = () => {
	const songs = playlistSongs.value;

	localSpotifyTracks.value.forEach((spotifyTrack, index) => {
		songs.forEach(playlistSong => {
			if (
				playlistSong.title
					.toLowerCase()
					.trim()
					.indexOf(spotifyTrack.name.toLowerCase().trim()) !== -1
			) {
				songs.splice(songs.indexOf(playlistSong), 1);
				trackSongs.value[index].push(playlistSong);
			}
		});
	});
};

const importChannel = () => {
	if (hasImportedPlaylist.value)
		return new Toast("A playlist has already imported.");
	if (isImportingPlaylist.value)
		return new Toast("A playlist is already importing.");

	isImportingPlaylist.value = true;

	// don't give starting import message instantly in case of instant error
	setTimeout(() => {
		if (isImportingPlaylist.value) {
			new Toast(
				"Starting to import your channel. This can take some time to do."
			);
		}
	}, 750);

	return socket.dispatch(
		"youtube.requestSet",
		props.youtubeChannelUrl,
		false,
		true,
		res => {
			const mediaSources = res.videos.map(
				video => `youtube:${video.youtubeId}`
			);

			socket.dispatch(
				"songs.getSongsFromMediaSources",
				mediaSources,
				res => {
					if (res.status === "success") {
						const { songs } = res.data;

						playlistSongs.value = songs;

						songs.forEach(() => {
							trackSongs.value.push([]);
						});

						hasImportedPlaylist.value = true;
						isImportingPlaylist.value = false;

						tryToAutoMove();
						return;
					}

					new Toast("Could not get songs.");
				}
			);

			return new Toast({ content: res.message, timeout: 20000 });
		}
	);
};

const importPlaylist = () => {
	if (hasImportedPlaylist.value)
		return new Toast("A playlist has already imported.");
	if (isImportingPlaylist.value)
		return new Toast("A playlist is already importing.");

	isImportingPlaylist.value = true;

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
		`https://youtube.com/playlist?list=${props.youtubePlaylistId}`,
		false,
		true,
		res => {
			const mediaSources = res.videos.map(
				video => `youtube:${video.youtubeId}`
			);

			socket.dispatch(
				"songs.getSongsFromMediaSources",
				mediaSources,
				res => {
					if (res.status === "success") {
						const { songs } = res.data;

						playlistSongs.value = songs;

						songs.forEach(() => {
							trackSongs.value.push([]);
						});

						hasImportedPlaylist.value = true;
						isImportingPlaylist.value = false;

						tryToAutoMove();
						return;
					}

					new Toast("Could not get songs.");
				}
			);

			return new Toast({ content: res.message, timeout: 20000 });
		}
	);
};

onMounted(() => {
	localSpotifyTracks.value = props.spotifyTracks;

	if (props.youtubePlaylistId) importPlaylist();
	else if (props.youtubeChannelUrl) importChannel();
});

onBeforeUnmount(() => {});
</script>

<template>
	<div>
		<modal
			title="Replace Spotify Songs"
			class="replace-spotify-songs-modal"
			size="wide"
		>
			<template #body>
				<div class="playlist-songs">
					<h4>YouTube songs</h4>
					<p v-if="isImportingPlaylist">Importing playlist...</p>
					<draggable-list
						v-if="playlistSongs.length > 0"
						v-model:list="playlistSongs"
						item-key="mediaSource"
						:group="`replace-spotify-album-${modalUuid}-songs`"
					>
						<template #item="{ element }">
							<song-item
								:key="`playlist-song-${element.mediaSource}`"
								:song="element"
							>
							</song-item>
						</template>
					</draggable-list>
				</div>
				<div class="track-boxes">
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
						<!-- :data-track-index="index" -->
						<div class="track-box-songs-drag-area">
							<draggable-list
								v-model:list="trackSongs[index]"
								item-key="mediaSource"
								:group="`replace-spotify-album-${modalUuid}-songs`"
							>
								<template #item="{ element }">
									<song-item
										:key="`track-song-${element.mediaSource}`"
										:song="element"
									>
									</song-item>
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
				</div>
			</template>
			<template #footer>
				<button class="button is-primary" @click="tryToAutoMove()">
					Try to auto move
				</button>
				<button
					class="button is-primary"
					@click="replaceAllSpotifySongs()"
				>
					Replace all songs
				</button>
			</template>
		</modal>
	</div>
</template>

<style lang="less">
.night-mode {
	.spotify-album-container,
	.playlist-songs,
	.track-boxes {
		background-color: var(--dark-grey-3) !important;
		border: 0 !important;
		.tab {
			border: 0 !important;
		}
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

.replace-spotify-songs-modal {
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

.spotify-album-container,
.playlist-songs {
	width: 500px;
	background-color: var(--light-grey);
	border: 1px rgba(163, 224, 255, 0.75) solid;
	border-radius: @border-radius;
	padding: 16px;
	overflow: auto;
	height: 100%;

	h4 {
		margin: 0;
		margin-bottom: 16px;
	}

	button {
		margin: 5px 0;
	}
}

.track-boxes {
	width: 500px;
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
