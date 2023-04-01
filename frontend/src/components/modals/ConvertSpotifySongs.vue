<script setup lang="ts">
import {
	defineProps,
	defineAsyncComponent,
	onMounted,
	ref,
	reactive,
	computed
} from "vue";
import Toast from "toasters";
import { useModalsStore } from "@/stores/modals";
import { useWebsocketsStore } from "@/stores/websockets";

const Modal = defineAsyncComponent(() => import("@/components/Modal.vue"));

const SongItem = defineAsyncComponent(
	() => import("@/components/SongItem.vue")
);

const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);

const { openModal, closeCurrentModal } = useModalsStore();
const { socket } = useWebsocketsStore();

const TAG = "CSS";

const props = defineProps({
	modalUuid: { type: String, required: true },
	playlistId: { type: String, default: null }
});

const playlist = ref(null);

const spotifySongs = ref([]);

const spotifyTracks = reactive({});
const spotifyAlbums = reactive({});
const spotifyArtists = reactive({});

const loadingPlaylist = ref(false);
const loadedPlaylist = ref(false);

const loadingSpotifyTracks = ref(false);
const loadedSpotifyTracks = ref(false);

const loadingSpotifyAlbums = ref(false);
const loadedSpotifyAlbums = ref(false);

const loadingSpotifyArtists = ref(false);
const loadedSpotifyArtists = ref(false);

const gettingAllAlternativeMediaPerTrack = ref(false);
const gotAllAlternativeMediaPerTrack = ref(false);
const alternativeMediaPerTrack = reactive({});

const gettingAllAlternativeAlbums = ref(false);
const gotAllAlternativeAlbums = ref(false);
const alternativeAlbumsPerAlbum = reactive({});

const gettingAllAlternativeArtists = ref(false);
const gotAllAlternativeArtists = ref(false);
const alternativeArtistsPerArtist = reactive({});

const alternativeMediaMap = reactive({});
const alternativeMediaFailedMap = reactive({});

const gettingMissingAlternativeMedia = ref(false);

const replacingAllSpotifySongs = ref(false);

const currentConvertType = ref<"track" | "album" | "artist">("track");
const showReplaceButtonPerAlternative = ref(true);
const hideSpotifySongsWithNoAlternativesFound = ref(false);

const preferredAlternativeSongMode = ref<
	"FIRST" | "LYRICS" | "TOPIC" | "LYRICS_TOPIC" | "TOPIC_LYRICS"
>("FIRST");

// const singleMode = ref(false);
const showExtra = ref(false);

const collectAlternativeMediaSourcesOrigins = ref(false);

const minimumSongsPerAlbum = ref(2);
const minimumSongsPerArtist = ref(2);
const sortAlbumMode = ref<
	"SONG_COUNT_ASC" | "SONG_COUNT_DESC" | "NAME_DESC" | "NAME_ASC"
>("SONG_COUNT_ASC");
const sortArtistMode = ref<
	"SONG_COUNT_ASC" | "SONG_COUNT_DESC" | "NAME_DESC" | "NAME_ASC"
>("SONG_COUNT_ASC");

const showDontConvertButton = ref(true);

const replaceSongUrlMap = reactive({});

const showReplacementInputs = ref(false);

const youtubeVideoUrlRegex =
	/^(https?:\/\/)?(www\.)?(m\.)?(music\.)?(youtube\.com|youtu\.be)\/(watch\?v=)?(?<youtubeId>[\w-]{11})((&([A-Za-z0-9]+)?)*)?$/;
const youtubeVideoIdRegex = /^([\w-]{11})$/;

const youtubePlaylistUrlRegex = /[\\?&]list=([^&#]*)/;

const filteredSpotifySongs = computed(() =>
	hideSpotifySongsWithNoAlternativesFound.value
		? spotifySongs.value.filter(
				spotifySong =>
					(!gettingAllAlternativeMediaPerTrack.value &&
						!gotAllAlternativeMediaPerTrack.value) ||
					(alternativeMediaPerTrack[spotifySong.mediaSource] &&
						alternativeMediaPerTrack[spotifySong.mediaSource]
							.mediaSources.length > 0)
		  )
		: spotifySongs.value
);

const filteredSpotifyArtists = computed(() => {
	let artists = Object.values(spotifyArtists);

	artists = artists.filter(
		artist => artist.songs.length >= minimumSongsPerArtist.value
	);

	let sortFn = null;
	if (sortArtistMode.value === "SONG_COUNT_ASC")
		sortFn = (artistA, artistB) =>
			artistA.songs.length - artistB.songs.length;
	else if (sortArtistMode.value === "SONG_COUNT_DESC")
		sortFn = (artistA, artistB) =>
			artistB.songs.length - artistA.songs.length;
	else if (loadedSpotifyArtists.value && sortArtistMode.value === "NAME_ASC")
		sortFn = (artistA, artistB) => {
			const nameA = artistA.rawData?.name?.toLowerCase();
			const nameB = artistB.rawData?.name?.toLowerCase();

			if (nameA === nameB) return 0;
			if (nameA < nameB) return -1;
			if (nameA > nameB) return 1;
			return 0;
		};
	else if (loadedSpotifyArtists.value && sortArtistMode.value === "NAME_DESC")
		sortFn = (artistA, artistB) => {
			const nameA = artistA.rawData?.name?.toLowerCase();
			const nameB = artistB.rawData?.name?.toLowerCase();

			if (nameA === nameB) return 0;
			if (nameA > nameB) return -1;
			if (nameA < nameB) return 1;
			return 0;
		};

	if (sortFn) artists = artists.sort(sortFn);

	return artists;
});

const filteredSpotifyAlbums = computed(() => {
	let albums = Object.values(spotifyAlbums);

	albums = albums.filter(
		album => album.songs.length >= minimumSongsPerAlbum.value
	);

	let sortFn = null;
	if (sortAlbumMode.value === "SONG_COUNT_ASC")
		sortFn = (albumA, albumB) => albumA.songs.length - albumB.songs.length;
	else if (sortAlbumMode.value === "SONG_COUNT_DESC")
		sortFn = (albumA, albumB) => albumB.songs.length - albumA.songs.length;
	else if (loadedSpotifyAlbums.value && sortAlbumMode.value === "NAME_ASC")
		sortFn = (albumA, albumB) => {
			const nameA = albumA.rawData?.name?.toLowerCase();
			const nameB = albumB.rawData?.name?.toLowerCase();

			if (nameA === nameB) return 0;
			if (nameA < nameB) return -1;
			if (nameA > nameB) return 1;
			return 0;
		};
	else if (loadedSpotifyAlbums.value && sortAlbumMode.value === "NAME_DESC")
		sortFn = (albumA, albumB) => {
			const nameA = albumA.rawData?.name?.toLowerCase();
			const nameB = albumB.rawData?.name?.toLowerCase();

			if (nameA === nameB) return 0;
			if (nameA > nameB) return -1;
			if (nameA < nameB) return 1;
			return 0;
		};

	if (sortFn) albums = albums.sort(sortFn);

	return albums;
});

const missingMediaSources = computed(() => {
	const missingMediaSources = [];

	Object.values(alternativeMediaPerTrack).forEach(({ mediaSources }) => {
		mediaSources.forEach(mediaSource => {
			if (
				!alternativeMediaMap[mediaSource] &&
				!alternativeMediaFailedMap[mediaSource] &&
				missingMediaSources.indexOf(mediaSource) === -1
			)
				missingMediaSources.push(mediaSource);
		});
	});

	return missingMediaSources;
});

const preferredAlternativeSongPerTrack = computed(() => {
	const returnObject = {};

	Object.entries(alternativeMediaPerTrack).forEach(
		([spotifyMediaSource, { mediaSources }]) => {
			returnObject[spotifyMediaSource] = null;
			if (mediaSources.length === 0) return;

			let sortFn = (mediaSourceA, mediaSourceB) => {
				if (preferredAlternativeSongMode.value === "FIRST") return 0;

				const aHasLyrics =
					alternativeMediaMap[mediaSourceA].title
						.toLowerCase()
						.indexOf("lyric") !== -1;
				const aHasTopic =
					alternativeMediaMap[mediaSourceA].artists[0]
						.toLowerCase()
						.indexOf("topic") !== -1;

				const bHasLyrics =
					alternativeMediaMap[mediaSourceB].title
						.toLowerCase()
						.indexOf("lyric") !== -1;
				const bHasTopic =
					alternativeMediaMap[mediaSourceB].artists[0]
						.toLowerCase()
						.indexOf("topic") !== -1;

				if (preferredAlternativeSongMode.value === "LYRICS") {
					if (aHasLyrics && bHasLyrics) return 0;
					if (aHasLyrics && !bHasLyrics) return -1;
					if (!aHasLyrics && bHasLyrics) return 1;
					return 0;
				}

				if (preferredAlternativeSongMode.value === "TOPIC") {
					if (aHasTopic && bHasTopic) return 0;
					if (aHasTopic && !bHasTopic) return -1;
					if (!aHasTopic && bHasTopic) return 1;
					return 0;
				}

				if (preferredAlternativeSongMode.value === "LYRICS_TOPIC") {
					if (aHasLyrics && bHasLyrics) return 0;
					if (aHasLyrics && !bHasLyrics) return -1;
					if (!aHasLyrics && bHasLyrics) return 1;
					if (aHasTopic && bHasTopic) return 0;
					if (aHasTopic && !bHasTopic) return -1;
					if (!aHasTopic && bHasTopic) return 1;
					return 0;
				}

				if (preferredAlternativeSongMode.value === "TOPIC_LYRICS") {
					if (aHasTopic && bHasTopic) return 0;
					if (aHasTopic && !bHasTopic) return -1;
					if (!aHasTopic && bHasTopic) return 1;
					if (aHasLyrics && bHasLyrics) return 0;
					if (aHasLyrics && !bHasLyrics) return -1;
					if (!aHasLyrics && bHasLyrics) return 1;
					return 0;
				}

				return 0;
			};

			if (
				mediaSources.length === 1 ||
				preferredAlternativeSongMode.value === "FIRST"
			)
				sortFn = () => 0;
			else if (preferredAlternativeSongMode.value === "LYRICS")
				sortFn = mediaSourceA => {
					if (!alternativeMediaMap[mediaSourceA]) return 0;
					if (
						alternativeMediaMap[mediaSourceA].title
							.toLowerCase()
							.indexOf("lyric") !== -1
					)
						return -1;
					return 1;
				};
			else if (preferredAlternativeSongMode.value === "TOPIC")
				sortFn = mediaSourceA => {
					if (!alternativeMediaMap[mediaSourceA]) return 0;
					if (
						alternativeMediaMap[mediaSourceA].artists[0]
							.toLowerCase()
							.indexOf("topic") !== -1
					)
						return -1;
					return 1;
				};

			const [firstMediaSource] = mediaSources
				.slice()
				.filter(mediaSource => !!alternativeMediaMap[mediaSource])
				.sort(sortFn);

			returnObject[spotifyMediaSource] = firstMediaSource;
		}
	);

	return returnObject;
});

const replaceAllSpotifySongs = async () => {
	if (replacingAllSpotifySongs.value) return;
	replacingAllSpotifySongs.value = true;

	const replaceArray = [];

	spotifySongs.value.forEach(spotifySong => {
		const spotifyMediaSource = spotifySong.mediaSource;
		const replacementMediaSource =
			preferredAlternativeSongPerTrack.value[spotifyMediaSource];

		if (!spotifyMediaSource || !replacementMediaSource) return;

		replaceArray.push([spotifyMediaSource, replacementMediaSource]);
	});

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

						resolve();
					}
				);
			})
	);

	Promise.allSettled(promises).finally(() => {
		replacingAllSpotifySongs.value = false;
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
		}
	);
};

const openReplaceAlbumModal = (spotifyAlbumId, youtubePlaylistId) => {
	console.log(spotifyAlbumId, youtubePlaylistId);

	if (
		!spotifyAlbums[spotifyAlbumId] ||
		!spotifyAlbums[spotifyAlbumId].rawData
	) {
		new Toast("Album hasn't loaded yet.");
		return;
	}

	openModal({
		modal: "replaceSpotifySongs",
		props: {
			playlistId: props.playlistId,
			youtubePlaylistId,
			spotifyTracks: spotifyAlbums[spotifyAlbumId].songs.map(
				mediaSource => spotifyTracks[mediaSource]
			)
		}
	});
};

const openReplaceAlbumModalFromUrl = spotifyAlbumId => {
	const replacementUrl = replaceSongUrlMap[`album:${spotifyAlbumId}`];

	console.log(spotifyAlbumId, replacementUrl);

	let youtubePlaylistId = null;

	const youtubePlaylistUrlRegexMatches =
		youtubePlaylistUrlRegex.exec(replacementUrl);
	if (youtubePlaylistUrlRegexMatches)
		[youtubePlaylistId] = youtubePlaylistUrlRegexMatches;

	console.log("Open modal for ", youtubePlaylistId);

	openReplaceAlbumModal(spotifyAlbumId, youtubePlaylistId);
};

const openReplaceArtistModal = (spotifyArtistId, youtubeChannelUrl) => {
	console.log(spotifyArtistId, youtubeChannelUrl);

	if (
		!spotifyArtists[spotifyArtistId] ||
		!spotifyArtists[spotifyArtistId].rawData
	) {
		new Toast("Artist hasn't loaded yet.");
		return;
	}

	openModal({
		modal: "replaceSpotifySongs",
		props: {
			playlistId: props.playlistId,
			youtubeChannelUrl,
			spotifyTracks: spotifyArtists[spotifyArtistId].songs.map(
				mediaSource => spotifyTracks[mediaSource]
			)
		}
	});
};

const openReplaceArtistModalFromUrl = spotifyArtistId => {
	const replacementUrl = replaceSongUrlMap[`artist:${spotifyArtistId}`];

	console.log(spotifyArtistId, replacementUrl);

	// let youtubeChannelId = null;

	// const youtubeChannelUrlRegexMatches =
	// 	youtubeChannelUrlRegex.exec(replacementUrl);
	// if (youtubeChannelUrlRegexMatches)
	// 	youtubeChannelId = youtubeChannelUrlRegexMatches[0];

	console.log("Open modal for ", replacementUrl);

	openReplaceArtistModal(spotifyArtistId, replacementUrl);
};

const replaceSongFromUrl = spotifyMediaSource => {
	const replacementUrl = replaceSongUrlMap[spotifyMediaSource];

	console.log(spotifyMediaSource, replacementUrl);

	let newMediaSource = null;

	const youtubeVideoUrlRegexMatches =
		youtubeVideoUrlRegex.exec(replacementUrl);
	console.log(youtubeVideoUrlRegexMatches);

	const youtubeVideoIdRegexMatches = youtubeVideoIdRegex.exec(replacementUrl);
	console.log(youtubeVideoIdRegexMatches);

	if (youtubeVideoUrlRegexMatches)
		newMediaSource = `youtube:${youtubeVideoUrlRegexMatches.groups.youtubeId}`;
	if (youtubeVideoIdRegexMatches)
		newMediaSource = `youtube:${youtubeVideoIdRegexMatches[0]}`;

	if (!newMediaSource) {
		new Toast("Invalid URL/identifier specified.");
		return;
	}

	replaceSpotifySong(spotifyMediaSource, newMediaSource);
};

const getMissingAlternativeMedia = () => {
	if (gettingMissingAlternativeMedia.value) return;

	gettingMissingAlternativeMedia.value = true;

	const _missingMediaSources = missingMediaSources.value;

	console.log("Getting missing", _missingMediaSources);

	socket.dispatch(
		"media.getMediaFromMediaSources",
		_missingMediaSources,
		res => {
			if (res.status === "success") {
				const { songMap } = res.data;

				_missingMediaSources.forEach(missingMediaSource => {
					if (songMap[missingMediaSource])
						alternativeMediaMap[missingMediaSource] =
							songMap[missingMediaSource];
					else alternativeMediaFailedMap[missingMediaSource] = true;
				});
			}

			gettingMissingAlternativeMedia.value = false;
		}
	);
};

const getAlternativeArtists = () => {
	if (gettingAllAlternativeArtists.value || gotAllAlternativeArtists.value)
		return;

	gettingAllAlternativeArtists.value = true;

	const artistIds = filteredSpotifyArtists.value.map(
		artist => artist.artistId
	);

	socket.dispatch(
		"apis.getAlternativeArtistSourcesForArtists",
		artistIds,
		collectAlternativeMediaSourcesOrigins.value,
		{
			cb: res => {
				console.log(
					"apis.getAlternativeArtistSourcesForArtists response",
					res
				);
			},
			onProgress: data => {
				console.log(
					"apis.getAlternativeArtistSourcesForArtists onProgress",
					data
				);

				if (data.status === "working") {
					if (data.data.status === "success") {
						const { artistId, result } = data.data;

						if (!spotifyArtists[artistId]) return;

						alternativeArtistsPerArtist[artistId] = {
							youtubeChannelIds: result
						};
					}
				} else if (data.status === "finished") {
					gotAllAlternativeArtists.value = true;
					gettingAllAlternativeArtists.value = false;
				}
			}
		}
	);
};

const getAlternativeAlbums = () => {
	if (gettingAllAlternativeAlbums.value || gotAllAlternativeAlbums.value)
		return;

	gettingAllAlternativeAlbums.value = true;

	const albumIds = filteredSpotifyAlbums.value.map(album => album.albumId);

	socket.dispatch(
		"apis.getAlternativeAlbumSourcesForAlbums",
		albumIds,
		collectAlternativeMediaSourcesOrigins.value,
		{
			cb: res => {
				console.log(
					"apis.getAlternativeAlbumSourcesForAlbums response",
					res
				);
			},
			onProgress: data => {
				console.log(
					"apis.getAlternativeAlbumSourcesForAlbums onProgress",
					data
				);

				if (data.status === "working") {
					if (data.data.status === "success") {
						const { albumId, result } = data.data;

						if (!spotifyAlbums[albumId]) return;

						alternativeAlbumsPerAlbum[albumId] = {
							youtubePlaylistIds: result
						};
					}
				} else if (data.status === "finished") {
					gotAllAlternativeAlbums.value = true;
					gettingAllAlternativeAlbums.value = false;
				}
			}
		}
	);
};

const getAlternativeMedia = () => {
	if (
		gettingAllAlternativeMediaPerTrack.value ||
		gotAllAlternativeMediaPerTrack.value
	)
		return;

	gettingAllAlternativeMediaPerTrack.value = true;

	const mediaSources = spotifySongs.value.map(song => song.mediaSource);

	socket.dispatch(
		"apis.getAlternativeMediaSourcesForTracks",
		mediaSources,
		collectAlternativeMediaSourcesOrigins.value,
		{
			cb: res => {
				console.log(
					"apis.getAlternativeMediaSourcesForTracks response",
					res
				);
			},
			onProgress: data => {
				console.log(
					"apis.getAlternativeMediaSourcesForTracks onProgress",
					data
				);

				if (data.status === "working") {
					if (data.data.status === "success") {
						const { mediaSource, result } = data.data;

						if (!spotifyTracks[mediaSource]) return;

						alternativeMediaPerTrack[mediaSource] = result;
					}
				} else if (data.status === "finished") {
					gotAllAlternativeMediaPerTrack.value = true;
					gettingAllAlternativeMediaPerTrack.value = false;

					getMissingAlternativeMedia();
				}
			}
		}
	);
};

const loadSpotifyArtists = () =>
	new Promise<void>(resolve => {
		console.debug(TAG, "Loading Spotify artists");

		loadingSpotifyArtists.value = true;

		const artistIds = filteredSpotifyArtists.value.map(
			artist => artist.artistId
		);

		socket.dispatch("spotify.getArtistsFromIds", artistIds, res => {
			console.debug(TAG, "Get artists response", res);

			if (res.status !== "success") {
				new Toast(res.message);
				closeCurrentModal();
				return;
			}

			const { artists } = res.data;

			artists.forEach(artist => {
				spotifyArtists[artist.artistId].rawData = artist.rawData;
			});

			console.debug(TAG, "Loaded Spotify artists");

			loadedSpotifyArtists.value = true;
			loadingSpotifyArtists.value = false;

			resolve();
		});
	});

const loadSpotifyAlbums = () =>
	new Promise<void>(resolve => {
		console.debug(TAG, "Loading Spotify albums");

		loadingSpotifyAlbums.value = true;

		const albumIds = filteredSpotifyAlbums.value.map(
			album => album.albumId
		);

		socket.dispatch("spotify.getAlbumsFromIds", albumIds, res => {
			console.debug(TAG, "Get albums response", res);

			if (res.status !== "success") {
				new Toast(res.message);
				closeCurrentModal();
				return;
			}

			const { albums } = res.data;

			albums.forEach(album => {
				spotifyAlbums[album.albumId].rawData = album.rawData;
			});

			console.debug(TAG, "Loaded Spotify albums");

			loadedSpotifyAlbums.value = true;
			loadingSpotifyAlbums.value = false;

			resolve();
		});
	});

const loadSpotifyTracks = () =>
	new Promise<void>(resolve => {
		console.debug(TAG, "Loading Spotify tracks");

		loadingSpotifyTracks.value = true;

		const mediaSources = spotifySongs.value.map(song => song.mediaSource);

		socket.dispatch(
			"spotify.getTracksFromMediaSources",
			mediaSources,
			res => {
				console.debug(TAG, "Get tracks response", res);

				if (res.status !== "success") {
					new Toast(res.message);
					closeCurrentModal();
					return;
				}

				const { tracks } = res.data;

				Object.entries(tracks).forEach(([mediaSource, track]) => {
					spotifyTracks[mediaSource] = track;

					const { albumId, albumImageUrl, artistIds, artists } =
						track;

					if (albumId) {
						if (!spotifyAlbums[albumId])
							spotifyAlbums[albumId] = {
								albumId,
								albumImageUrl,
								songs: []
							};

						spotifyAlbums[albumId].songs.push(mediaSource);
					}

					artistIds.forEach((artistId, artistIndex) => {
						if (!spotifyArtists[artistId]) {
							spotifyArtists[artistId] = {
								artistId,
								name: artists[artistIndex],
								songs: [],
								expanded: false
							};
						}

						spotifyArtists[artistId].songs.push(mediaSource);
					});
				});

				console.debug(TAG, "Loaded Spotify tracks");

				loadedSpotifyTracks.value = true;
				loadingSpotifyTracks.value = false;

				resolve();
			}
		);
	});

const loadPlaylist = () =>
	new Promise<void>(resolve => {
		console.debug(TAG, `Loading playlist ${props.playlistId}`);

		loadingPlaylist.value = true;

		socket.dispatch("playlists.getPlaylist", props.playlistId, res => {
			console.debug(TAG, "Get playlist response", res);

			if (res.status !== "success") {
				new Toast(res.message);
				closeCurrentModal();
				return;
			}

			playlist.value = res.data.playlist;

			spotifySongs.value = playlist.value.songs.filter(song =>
				song.mediaSource.startsWith("spotify:")
			);

			console.debug(TAG, `Loaded playlist ${props.playlistId}`);

			loadedPlaylist.value = true;
			loadingPlaylist.value = false;

			resolve();
		});
	});

const removeAlternativeTrack = (spotifyMediaSource, alternativeMediaSource) => {
	alternativeMediaPerTrack[spotifyMediaSource].mediaSources =
		alternativeMediaPerTrack[spotifyMediaSource].mediaSources.filter(
			mediaSource => mediaSource !== alternativeMediaSource
		);
};

const removeSpotifyTrack = mediaSource => {
	const spotifyTrack = spotifyTracks[mediaSource];
	if (spotifyTrack) {
		delete spotifyTracks[mediaSource];

		spotifyTrack.artistIds.forEach(artistId => {
			const spotifyArtist = spotifyArtists[artistId];

			if (spotifyArtist) {
				if (spotifyArtist.songs.length === 1)
					delete spotifyArtists[artistId];
				else
					spotifyArtists[artistId].songs = spotifyArtists[
						artistId
					].songs.filter(
						_mediaSource => _mediaSource !== mediaSource
					);
			}
		});

		const spotifyAlbum = spotifyAlbums[spotifyTrack.albumId];

		if (spotifyAlbum) {
			if (spotifyAlbum.songs.length === 1)
				delete spotifyAlbums[spotifyTrack.albumId];
			else
				spotifyAlbums[spotifyTrack.albumId].songs = spotifyAlbums[
					spotifyTrack.albumId
				].songs.filter(_mediaSource => _mediaSource !== mediaSource);
		}
	}
};

const removeSpotifySong = mediaSource => {
	// remove song
	playlist.value.songs = playlist.value.songs.filter(
		song => song.mediaSource !== mediaSource
	);

	spotifySongs.value = spotifySongs.value.filter(
		song => song.mediaSource !== mediaSource
	);

	removeSpotifyTrack(mediaSource);

	delete alternativeMediaMap[mediaSource];
	delete alternativeMediaFailedMap[mediaSource];
};

onMounted(() => {
	console.debug(TAG, "On mounted start");

	loadPlaylist().then(loadSpotifyTracks);

	socket.on(
		"event:playlist.song.removed",
		res => {
			console.log("SONG REMOVED", res);

			if (
				loadedPlaylist.value &&
				playlist.value._id === res.data.playlistId
			) {
				const { oldMediaSource } = res.data;

				removeSpotifySong(oldMediaSource);
			}
		},
		{ modalUuid: props.modalUuid }
	);

	socket.on(
		"event:playlist.song.replaced",
		res => {
			console.log(
				"SONG REPLACED",
				res,
				playlist.value._id === res.data.playlistId
			);

			if (
				loadedPlaylist.value &&
				playlist.value._id === res.data.playlistId
			) {
				const { oldMediaSource } = res.data;

				removeSpotifySong(oldMediaSource);
			}
		},
		{ modalUuid: props.modalUuid }
	);

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
				<template v-if="loadedPlaylist && spotifySongs.length === 0">
					<h2>All Spotify songs have been converted</h2>
					<button
						class="button is-primary is-fullwidth"
						@click="closeCurrentModal()"
					>
						Close modal
					</button>
				</template>
				<template v-else>
					<div class="buttons-options-info-row">
						<div class="buttons">
							<quick-confirm
								v-if="
									gotAllAlternativeMediaPerTrack &&
									missingMediaSources.length === 0 &&
									!replacingAllSpotifySongs
								"
								placement="top"
								@confirm="replaceAllSpotifySongs()"
							>
								<button class="button is-primary is-fullwidth">
									Replace all available songs with provided
									prefer settings
								</button>
							</quick-confirm>
							<button
								v-if="
									loadedSpotifyTracks &&
									!gettingAllAlternativeMediaPerTrack &&
									!gotAllAlternativeMediaPerTrack &&
									currentConvertType === 'track'
								"
								class="button is-primary"
								@click="getAlternativeMedia()"
							>
								Get alternative media
							</button>
							<button
								v-if="
									currentConvertType === 'track' &&
									gotAllAlternativeMediaPerTrack &&
									!gettingMissingAlternativeMedia &&
									missingMediaSources.length > 0
								"
								class="button is-primary"
								@click="getMissingAlternativeMedia()"
							>
								Get missing alternative media
							</button>

							<button
								v-if="
									loadedSpotifyTracks &&
									!loadingSpotifyAlbums &&
									!loadedSpotifyAlbums &&
									currentConvertType === 'album'
								"
								class="button is-primary"
								@click="loadSpotifyAlbums()"
							>
								Get Spotify albums
							</button>
							<button
								v-if="
									loadedSpotifyTracks &&
									loadedSpotifyAlbums &&
									!gettingAllAlternativeAlbums &&
									!gotAllAlternativeAlbums &&
									currentConvertType === 'album'
								"
								class="button is-primary"
								@click="getAlternativeAlbums()"
							>
								Get alternative albums
							</button>

							<button
								v-if="
									loadedSpotifyTracks &&
									!loadingSpotifyArtists &&
									!loadedSpotifyArtists &&
									currentConvertType === 'artist'
								"
								class="button is-primary"
								@click="loadSpotifyArtists()"
							>
								Get Spotify artists
							</button>
							<button
								v-if="
									loadedSpotifyTracks &&
									loadedSpotifyArtists &&
									!gettingAllAlternativeArtists &&
									!gotAllAlternativeArtists &&
									currentConvertType === 'artist'
								"
								class="button is-primary"
								@click="getAlternativeArtists()"
							>
								Get alternative artists
							</button>
						</div>

						<div class="options">
							<p class="is-expanded checkbox-control">
								<label class="switch">
									<input
										type="checkbox"
										id="show-extra"
										v-model="showExtra"
									/>
									<span class="slider round"></span>
								</label>

								<label for="show-extra">
									<p>Show extra info</p>
								</label>
							</p>

							<p class="is-expanded checkbox-control">
								<label class="switch">
									<input
										type="checkbox"
										id="collect-alternative-media-sources-origins"
										v-model="
											collectAlternativeMediaSourcesOrigins
										"
									/>
									<span class="slider round"></span>
								</label>

								<label
									for="collect-alternative-media-sources-origins"
								>
									<p>
										Collect alternative media sources
										origins
									</p>
								</label>
							</p>

							<p class="is-expanded checkbox-control">
								<label class="switch">
									<input
										type="checkbox"
										id="show-replace-button-per-alternative"
										v-model="
											showReplaceButtonPerAlternative
										"
									/>
									<span class="slider round"></span>
								</label>

								<label
									for="show-replace-button-per-alternative"
								>
									<p>Show replace button per alternative</p>
								</label>
							</p>

							<p class="is-expanded checkbox-control">
								<label class="switch">
									<input
										type="checkbox"
										id="showDontConvertButton"
										v-model="showDontConvertButton"
									/>
									<span class="slider round"></span>
								</label>

								<label for="showDontConvertButton">
									<p>Show don't convert buttons</p>
								</label>
							</p>

							<p class="is-expanded checkbox-control">
								<label class="switch">
									<input
										type="checkbox"
										id="showReplacementInputs"
										v-model="showReplacementInputs"
									/>
									<span class="slider round"></span>
								</label>

								<label for="showReplacementInputs">
									<p>Show replacement inputs</p>
								</label>
							</p>

							<p class="is-expanded checkbox-control">
								<label class="switch">
									<input
										type="checkbox"
										id="hide-spotify-songs-with-no-alternatives-found"
										v-model="
											hideSpotifySongsWithNoAlternativesFound
										"
									/>
									<span class="slider round"></span>
								</label>

								<label
									for="hide-spotify-songs-with-no-alternatives-found"
								>
									<p>
										Hide Spotify songs with no alternatives
										found
									</p>
								</label>
							</p>

							<div class="control">
								<label class="label"
									>Get alternatives per</label
								>
								<p class="control is-expanded select">
									<select
										v-model="currentConvertType"
										:disabled="
											gettingAllAlternativeMediaPerTrack
										"
									>
										<option value="track">Track</option>
										<option value="artist">Artist</option>
										<option value="album">Album</option>
									</select>
								</p>
							</div>

							<div
								class="control"
								v-if="currentConvertType === 'track'"
							>
								<label class="label"
									>Preferred track mode</label
								>
								<p class="control is-expanded select">
									<select
										v-model="preferredAlternativeSongMode"
										:disabled="false"
									>
										<option value="FIRST">
											First song
										</option>
										<option value="LYRICS">
											First song with lyrics in title
										</option>
										<option value="TOPIC">
											First song from topic channel
											(YouTube only)
										</option>
										<option value="LYRICS_TOPIC">
											First song with lyrics in title, or
											from topic channel (YouTube only)
										</option>
										<option value="TOPIC_LYRICS">
											First song from topic channel
											(YouTube only), or with lyrics in
											title
										</option>
									</select>
								</p>
							</div>

							<div
								class="small-section"
								v-if="currentConvertType === 'album'"
							>
								<label class="label"
									>Minimum songs per album</label
								>
								<div class="control is-expanded">
									<input
										class="input"
										type="number"
										min="1"
										v-model="minimumSongsPerAlbum"
									/>
								</div>
							</div>

							<div
								class="small-section"
								v-if="currentConvertType === 'artist'"
							>
								<label class="label"
									>Minimum songs per artist</label
								>
								<div class="control is-expanded">
									<input
										class="input"
										type="number"
										min="1"
										v-model="minimumSongsPerArtist"
									/>
								</div>
							</div>

							<div
								class="control"
								v-if="currentConvertType === 'album'"
							>
								<label class="label">Sort album mode</label>
								<p class="control is-expanded select">
									<select v-model="sortAlbumMode">
										<option value="SONG_COUNT_ASC">
											Song count (ascending)
										</option>
										<option value="SONG_COUNT_DESC">
											Song count (descending)
										</option>
										<option value="NAME_ASC">
											Name (ascending)
										</option>
										<option value="NAME_DESC">
											Name (descending)
										</option>
									</select>
								</p>
							</div>

							<div
								class="control"
								v-if="currentConvertType === 'artist'"
							>
								<label class="label">Sort artist mode</label>
								<p class="control is-expanded select">
									<select v-model="sortArtistMode">
										<option value="SONG_COUNT_ASC">
											Song count (ascending)
										</option>
										<option value="SONG_COUNT_DESC">
											Song count (descending)
										</option>
										<option value="NAME_ASC">
											Name (ascending)
										</option>
										<option value="NAME_DESC">
											Name (descending)
										</option>
									</select>
								</p>
							</div>
						</div>

						<div class="info">
							<h6>Status</h6>

							<p>Loading playlist: {{ loadingPlaylist }}</p>
							<p>Loaded playlist: {{ loadedPlaylist }}</p>

							<p>
								Spotify songs in playlist:
								{{ spotifySongs.length }}
							</p>

							<p>Converting by {{ currentConvertType }}</p>

							<hr />

							<p>
								Loading Spotify tracks:
								{{ loadingSpotifyTracks }}
							</p>
							<p>
								Loaded Spotify tracks: {{ loadedSpotifyTracks }}
							</p>

							<p>
								Spotify tracks loaded:
								{{ Object.keys(spotifyTracks).length }}
							</p>

							<p>
								Loading Spotify albums:
								{{ loadingSpotifyAlbums }}
							</p>
							<p>
								Loaded Spotify albums: {{ loadedSpotifyAlbums }}
							</p>

							<p>
								Spotify albums:
								{{ Object.keys(spotifyAlbums).length }}
							</p>

							<p>
								Spotify artists:
								{{ Object.keys(spotifyArtists).length }}
							</p>

							<p>
								Getting missing alternative media:
								{{ gettingMissingAlternativeMedia }}
							</p>

							<p>
								Getting all alternative media per track:
								{{ gettingAllAlternativeMediaPerTrack }}
							</p>
							<p>
								Got all alternative media per track:
								{{ gotAllAlternativeMediaPerTrack }}
							</p>

							<hr />

							<p>
								Alternative media loaded:
								{{ Object.keys(alternativeMediaMap).length }}
							</p>
							<p>
								Alternative media that failed to load:
								{{
									Object.keys(alternativeMediaFailedMap)
										.length
								}}
							</p>

							<hr />

							<p>
								Replacing all Spotify songs:
								{{ replacingAllSpotifySongs }}
							</p>
						</div>
					</div>

					<br />

					<hr />

					<div
						class="convert-table convert-song-by-track"
						v-if="currentConvertType === 'track'"
					>
						<h4>Spotify songs</h4>
						<h4>Alternative songs</h4>

						<template
							v-for="spotifySong in filteredSpotifySongs"
							:key="spotifySong.mediaSource"
						>
							<div
								class="convert-table-cell convert-table-cell-left"
							>
								<song-item :song="spotifySong">
									<template #leftIcon>
										<a
											:href="`https://open.spotify.com/track/${
												spotifySong.mediaSource.split(
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
								<template v-if="showExtra">
									<p>
										Media source:
										{{ spotifySong.mediaSource }}
									</p>
									<p v-if="loadedSpotifyTracks">
										ISRC:
										{{
											spotifyTracks[
												spotifySong.mediaSource
											].externalIds.isrc
										}}
									</p>
								</template>
								<button
									v-if="showDontConvertButton"
									class="button is-primary is-fullwidth"
									@click="
										removeSpotifySong(
											spotifySong.mediaSource
										)
									"
								>
									Don't convert this song
								</button>
							</div>
							<div
								class="convert-table-cell convert-table-cell-right"
							>
								<p
									v-if="
										!alternativeMediaPerTrack[
											spotifySong.mediaSource
										]
									"
								>
									Alternatives not loaded yet
								</p>
								<template v-else>
									<div class="alternative-media-items">
										<div
											class="alternative-media-item"
											:class="{
												'selected-alternative-song':
													preferredAlternativeSongPerTrack[
														spotifySong.mediaSource
													] ===
														alternativeMediaSource &&
													missingMediaSources.length ===
														0
											}"
											v-for="alternativeMediaSource in alternativeMediaPerTrack[
												spotifySong.mediaSource
											].mediaSources"
											:key="
												spotifySong.mediaSource +
												alternativeMediaSource
											"
										>
											<p
												v-if="
													alternativeMediaFailedMap[
														alternativeMediaSource
													]
												"
											>
												Song
												{{ alternativeMediaSource }}
												failed to load
											</p>
											<p
												v-else-if="
													!alternativeMediaMap[
														alternativeMediaSource
													]
												"
											>
												Song
												{{ alternativeMediaSource }}
												hasn't been loaded yet
											</p>
											<template v-else>
												<div
													class="alternative-song-container"
												>
													<song-item
														:song="
															alternativeMediaMap[
																alternativeMediaSource
															]
														"
													>
														<template #leftIcon>
															<a
																v-if="
																	alternativeMediaSource.split(
																		':'
																	)[0] ===
																	'youtube'
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
																	)[0] ===
																	'soundcloud'
																"
																target="_blank"
															>
																<div
																	class="soundcloud-icon left-icon"
																></div>
															</a>
														</template>
													</song-item>
													<quick-confirm
														v-if="
															showReplaceButtonPerAlternative
														"
														placement="top"
														@confirm="
															replaceSpotifySong(
																spotifySong.mediaSource,
																alternativeMediaSource
															)
														"
													>
														<button
															class="button is-primary is-fullwidth"
														>
															Use this alternative
														</button>
													</quick-confirm>
													<button
														v-if="
															showDontConvertButton
														"
														class="button is-primary is-fullwidth"
														@click="
															removeAlternativeTrack(
																spotifySong.mediaSource,
																alternativeMediaSource
															)
														"
													>
														Remove this alternative
													</button>
												</div>
												<ul v-if="showExtra">
													<li
														v-for="origin in alternativeMediaPerTrack[
															spotifySong
																.mediaSource
														].mediaSourcesOrigins[
															alternativeMediaSource
														]"
														:key="
															spotifySong.mediaSource +
															alternativeMediaSource +
															origin
														"
													>
														<hr />
														<ul>
															<li
																v-for="originItem in origin"
																:key="
																	spotifySong.mediaSource +
																	alternativeMediaSource +
																	origin +
																	originItem
																"
															>
																+
																{{ originItem }}
															</li>
														</ul>
													</li>
												</ul>
											</template>
										</div>
									</div>
									<p
										v-if="
											alternativeMediaPerTrack[
												spotifySong.mediaSource
											].mediaSources.length === 0
										"
									>
										No alternative media sources found
									</p>
								</template>
								<div
									v-if="
										showReplacementInputs ||
										(alternativeMediaPerTrack[
											spotifySong.mediaSource
										] &&
											alternativeMediaPerTrack[
												spotifySong.mediaSource
											].mediaSources.length === 0)
									"
								>
									<div>
										<label class="label">
											Enter replacement song from URL
										</label>
										<div
											class="control is-grouped input-with-button"
										>
											<p class="control is-expanded">
												<input
													class="input"
													type="text"
													placeholder="Enter your song URL here..."
													v-model="
														replaceSongUrlMap[
															spotifySong
																.mediaSource
														]
													"
													@keyup.enter="
														replaceSongFromUrl(
															spotifySong.mediaSource
														)
													"
												/>
											</p>
											<p class="control">
												<a
													class="button is-info"
													@click="
														replaceSongFromUrl(
															spotifySong.mediaSource
														)
													"
													>Replace song</a
												>
											</p>
										</div>
									</div>
								</div>
							</div>
						</template>
					</div>

					<div
						class="convert-table convert-song-by-album"
						v-if="currentConvertType === 'album'"
					>
						<h4>Spotify albums</h4>
						<h4>Alternative albums (playlists)</h4>

						<template
							v-for="spotifyAlbum in filteredSpotifyAlbums"
							:key="spotifyAlbum"
						>
							<div
								class="convert-table-cell convert-table-cell-left"
							>
								<p>Album ID: {{ spotifyAlbum.albumId }}</p>
								<p v-if="loadingSpotifyAlbums">
									Loading album info...
								</p>
								<p
									v-else-if="
										loadedSpotifyAlbums &&
										!spotifyAlbum.rawData
									"
								>
									Failed to load album info...
								</p>
								<template v-else-if="loadedSpotifyAlbums">
									<p>Name: {{ spotifyAlbum.rawData.name }}</p>
									<p>
										Label: {{ spotifyAlbum.rawData.label }}
									</p>
									<p>
										Popularity:
										{{ spotifyAlbum.rawData.popularity }}
									</p>
									<p>
										Release date:
										{{ spotifyAlbum.rawData.release_date }}
									</p>
									<p>
										Artists:
										{{
											spotifyAlbum.rawData.artists
												.map(artist => artist.name)
												.join(", ")
										}}
									</p>
									<p>
										UPC:
										{{
											spotifyAlbum.rawData.external_ids
												.upc
										}}
									</p>
								</template>
								<song-item
									v-for="spotifyMediaSource in spotifyAlbum.songs"
									:key="
										spotifyAlbum.albumId +
										spotifyMediaSource
									"
									:song="{
										mediaSource: spotifyMediaSource,
										title: spotifyTracks[spotifyMediaSource]
											.name,
										artists:
											spotifyTracks[spotifyMediaSource]
												.artists,
										duration:
											spotifyTracks[spotifyMediaSource]
												.duration,
										thumbnail:
											spotifyTracks[spotifyMediaSource]
												.albumImageUrl
									}"
								>
									<template #leftIcon>
										<a
											:href="`https://open.spotify.com/track/${
												spotifyMediaSource.split(':')[1]
											}`"
											target="_blank"
										>
											<div
												class="spotify-icon left-icon"
											></div>
										</a>
									</template>
								</song-item>
							</div>
							<div
								class="convert-table-cell convert-table-cell-right"
							>
								<p
									v-if="
										!alternativeAlbumsPerAlbum[
											spotifyAlbum.albumId
										]
									"
								>
									No alternatives loaded
								</p>
								<div
									class="alternative-album-items"
									v-if="
										alternativeAlbumsPerAlbum[
											spotifyAlbum.albumId
										]
									"
								>
									<p
										v-if="
											alternativeAlbumsPerAlbum[
												spotifyAlbum.albumId
											].youtubePlaylistIds.length === 0
										"
									>
										No alternative playlists were found
									</p>
									<div
										class="alternative-album-item"
										v-for="youtubePlaylistId in alternativeAlbumsPerAlbum[
											spotifyAlbum.albumId
										].youtubePlaylistIds"
										:key="
											spotifyAlbum.albumId +
											youtubePlaylistId
										"
									>
										<p>
											YouTube Playlist
											{{ youtubePlaylistId }} has been
											automatically found
										</p>
										<button
											class="button is-primary is-fullwidth"
											@click="
												openReplaceAlbumModal(
													spotifyAlbum.albumId,
													youtubePlaylistId
												)
											"
										>
											Open replace modal
										</button>
									</div>
								</div>

								<div
									v-if="
										showReplacementInputs ||
										(alternativeAlbumsPerAlbum[
											spotifyAlbum.albumId
										] &&
											alternativeAlbumsPerAlbum[
												spotifyAlbum.albumId
											].youtubePlaylistIds.length === 0)
									"
								>
									<div>
										<label class="label">
											Enter replacement playlist URL
										</label>
										<div
											class="control is-grouped input-with-button"
										>
											<p class="control is-expanded">
												<input
													class="input"
													type="text"
													placeholder="Enter your playlist URL here..."
													v-model="
														replaceSongUrlMap[
															`album:${spotifyAlbum.albumId}`
														]
													"
													@keyup.enter="
														openReplaceAlbumModalFromUrl(
															spotifyAlbum.albumId
														)
													"
												/>
											</p>
											<p class="control">
												<a
													class="button is-info"
													@click="
														openReplaceAlbumModalFromUrl(
															spotifyAlbum.albumId
														)
													"
													>Open replace modal</a
												>
											</p>
										</div>
									</div>
								</div>
							</div>
						</template>
					</div>

					<div
						class="convert-table convert-song-by-artist"
						v-if="currentConvertType === 'artist'"
					>
						<h4>Spotify artists</h4>
						<h4>Alternative artists (channels)</h4>

						<template
							v-for="spotifyArtist in filteredSpotifyArtists"
							:key="spotifyArtist"
						>
							<div
								class="convert-table-cell convert-table-cell-left"
							>
								<p>Artist ID: {{ spotifyArtist.artistId }}</p>
								<p v-if="loadingSpotifyArtists">
									Loading artist info...
								</p>
								<p
									v-else-if="
										loadedSpotifyArtists &&
										!spotifyArtist.rawData
									"
								>
									Failed to load artist info...
								</p>
								<template v-else-if="loadedSpotifyArtists">
									<p>
										Name: {{ spotifyArtist.rawData.name }}
									</p>
									<!-- <p>
										Label: {{ spotifyArtist.rawData.label }}
									</p>
									<p>
										Popularity:
										{{ spotifyArtist.rawData.popularity }}
									</p>
									<p>
										Release date:
										{{ spotifyArtist.rawData.release_date }}
									</p>
									<p>
										Artists:
										{{
											spotifyArtist.rawData.artists
												.map(artist => artist.name)
												.join(", ")
										}}
									</p>
									<p>
										UPC:
										{{
											spotifyArtist.rawData.external_ids
												.upc
										}}
									</p> -->
								</template>
								<song-item
									v-for="spotifyMediaSource in spotifyArtist.songs"
									:key="
										spotifyArtist.artistId +
										spotifyMediaSource
									"
									:song="{
										mediaSource: spotifyMediaSource,
										title: spotifyTracks[spotifyMediaSource]
											.name,
										artists:
											spotifyTracks[spotifyMediaSource]
												.artists,
										duration:
											spotifyTracks[spotifyMediaSource]
												.duration,
										thumbnail:
											spotifyTracks[spotifyMediaSource]
												.albumImageUrl
									}"
								>
									<template #leftIcon>
										<a
											:href="`https://open.spotify.com/track/${
												spotifyMediaSource.split(':')[1]
											}`"
											target="_blank"
										>
											<div
												class="spotify-icon left-icon"
											></div>
										</a>
									</template>
								</song-item>
							</div>
							<div
								class="convert-table-cell convert-table-cell-right"
							>
								<p
									v-if="
										!alternativeArtistsPerArtist[
											spotifyArtist.artistId
										]
									"
								>
									No alternatives loaded
								</p>
								<div
									class="alternative-artist-items"
									v-if="
										alternativeArtistsPerArtist[
											spotifyArtist.artistId
										]
									"
								>
									<p
										v-if="
											alternativeArtistsPerArtist[
												spotifyArtist.artistId
											].youtubeChannelIds.length === 0
										"
									>
										No alternative channels were found
									</p>
									<div
										class="alternative-artist-item"
										v-for="youtubeChannelId in alternativeArtistsPerArtist[
											spotifyArtist.artistId
										].youtubeChannelIds"
										:key="
											spotifyArtist.artistId +
											youtubeChannelId
										"
									>
										<p>
											YouTube channel
											{{ youtubeChannelId }} has been
											automatically found
										</p>
										<button
											class="button is-primary is-fullwidth"
											@click="
												openReplaceArtistModal(
													spotifyArtist.artistId,
													`https://youtube.com/channel/${youtubeChannelId}`
												)
											"
										>
											Open replace modal
										</button>
									</div>
								</div>

								<div
									v-if="
										showReplacementInputs ||
										(alternativeArtistsPerArtist[
											spotifyArtist.artistId
										] &&
											alternativeArtistsPerArtist[
												spotifyArtist.artistId
											].youtubeChannelIds.length === 0)
									"
								>
									<div>
										<label class="label">
											Enter replacement YouTube channel
											URL
										</label>
										<div
											class="control is-grouped input-with-button"
										>
											<p class="control is-expanded">
												<input
													class="input"
													type="text"
													placeholder="Enter your channel URL here..."
													v-model="
														replaceSongUrlMap[
															`artist:${spotifyArtist.artistId}`
														]
													"
													@keyup.enter="
														openReplaceArtistModalFromUrl(
															spotifyArtist.artistId
														)
													"
												/>
											</p>
											<p class="control">
												<a
													class="button is-info"
													@click="
														openReplaceArtistModalFromUrl(
															spotifyArtist.artistId
														)
													"
													>Open replace modal</a
												>
											</p>
										</div>
									</div>
								</div>
							</div>
						</template>
					</div>
				</template>
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

.alternative-media-items {
	display: flex;
	flex-direction: column;
	row-gap: 12px;
}

.alternative-song-container,
.convert-table-cell-left {
	display: flex;
	flex-direction: column;
	row-gap: 12px;

	> * {
		flex-grow: 0;
	}
}

.convert-table {
	display: grid;
	grid-template-columns: 50% 50%;
	gap: 1px;

	.convert-table-cell {
		outline: 1px solid white;
		padding: 4px;
	}
}

.selected-alternative-song {
	// outline: 4px solid red;
	border-left: 12px solid var(--primary-color);
	padding: 4px;
}

.buttons-options-info-row {
	display: grid;
	grid-template-columns: 33.3% 33.3% 33.3%;
	gap: 8px;

	.buttons,
	.options {
		display: flex;
		flex-direction: column;
		row-gap: 8px;

		> .control {
			margin-bottom: 0 !important;
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
