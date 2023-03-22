<script setup lang="ts">
import {
	defineAsyncComponent,
	ref,
	computed,
	watch,
	onMounted,
	onBeforeUnmount
} from "vue";
import { useRoute, useRouter } from "vue-router";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { ContentLoader } from "vue-content-loader";
import canAutoPlay from "can-autoplay";
import { useSoundcloudPlayer } from "@/composables/useSoundcloudPlayer";
import { useWebsocketsStore } from "@/stores/websockets";
import { useConfigStore } from "@/stores/config";
import { useStationStore } from "@/stores/station";
import { useUserAuthStore } from "@/stores/userAuth";
import { useUserPreferencesStore } from "@/stores/userPreferences";
import { useModalsStore } from "@/stores/modals";
import aw from "@/aw";
import ms from "@/ms";
import keyboardShortcuts from "@/keyboardShortcuts";
import utils from "@/utils";

const TAG = "[STATION]";

const MainHeader = defineAsyncComponent(
	() => import("@/components/MainHeader.vue")
);
const MainFooter = defineAsyncComponent(
	() => import("@/components/MainFooter.vue")
);
const FloatingBox = defineAsyncComponent(
	() => import("@/components/FloatingBox.vue")
);
const StationInfoBox = defineAsyncComponent(
	() => import("@/components/StationInfoBox.vue")
);
const AddToPlaylistDropdown = defineAsyncComponent(
	() => import("@/components/AddToPlaylistDropdown.vue")
);
const SongItem = defineAsyncComponent(
	() => import("@/components/SongItem.vue")
);
const Z404 = defineAsyncComponent(() => import("@/pages/404.vue"));
const StationSidebar = defineAsyncComponent(
	() => import("./Sidebar/index.vue")
);

const route = useRoute();
const router = useRouter();

const { socket } = useWebsocketsStore();
const configStore = useConfigStore();
const stationStore = useStationStore();
const userAuthStore = useUserAuthStore();
const userPreferencesStore = useUserPreferencesStore();

const {
	soundcloudIframeElement,
	soundcloudLoadTrack,
	soundcloudSeekTo,
	soundcloudPlay,
	soundcloudPause,
	soundcloudSetVolume,
	soundcloudGetPosition,
	soundcloudBindListener,
	soundcloudOnTrackStateChange,
	soundcloudDestroy,
	soundcloudUnload
} = useSoundcloudPlayer();

// TODO this might need a different place, like onMounted
const isApple = ref(
	navigator.platform.match(/iPhone|iPod|iPad/) ||
		navigator.vendor === "Apple Computer, Inc."
);
const loading = ref(true);
const exists = ref(true);
const youtubePlayerReady = ref(false);
const youtubePlayer = ref(undefined);
const timePaused = ref(0);
const muted = ref(false);
const timeElapsed = ref("0:00");
const timeBeforePause = ref(0);
const systemDifference = ref(0);
const attemptsToPlayVideo = ref(0);
const canAutoplay = ref(true);
const lastTimeRequestedIfCanAutoplay = ref(0);
const seeking = ref(false);
const playbackRate = ref(1);
const volumeSliderValue = ref(0);
const showPlaylistDropdown = ref(false);
const seekerbarPercentage = ref(0);
const frontendDevMode = ref("production");
const activityWatchMediaDataInterval = ref(null);
const activityWatchMediaLastStatus = ref("");
const activityWatchMediaLastMediaSource = ref("");
const activityWatchMediaLastStartDuration = ref(0);
const reportStationStateInterval = ref(null);
const nextCurrentSong = ref(null);
const mediaModalWatcher = ref(null);
const beforeMediaModalLocalPausedLock = ref(false);
const beforeMediaModalLocalPaused = ref(null);
const persistentToastCheckerInterval = ref(null);
const persistentToasts = ref([]);
// Experimental options
const experimentalChangableListenModeEnabled = ref(false);
const experimentalChangableListenMode = ref("listen_and_participate"); // Can be either listen_and_participate or participate
// End experimental options
// NEW
const videoLoading = ref();
const startedAt = ref();
const pausedAt = ref();
const stationIdentifier = ref();
// ENDNEW

const playerDebugBox = ref();
const keyboardShortcutsHelper = ref();

const autoPaused = ref(false);

const modalsStore = useModalsStore();
const { activeModals } = storeToRefs(modalsStore);

// TODO fix this if it still has some use, as this is no longer accurate
// const video = computed(() => store.state.modals.editSong);

const { loggedIn, userId } = storeToRefs(userAuthStore);
const { nightmode, autoSkipDisliked } = storeToRefs(userPreferencesStore);
const {
	station,
	currentSong,
	nextSong,
	songsList,
	stationPaused,
	localPaused,
	noSong,
	autoRequest,
	autoRequestLock,
	history
} = storeToRefs(stationStore);

const youtubePlayerState = ref<
	null | "UNSTARTED" | "ENDED" | "PLAYING" | "PAUSED" | "BUFFERING" | "CUED"
>(null);

const skipVotesLoaded = computed(
	() =>
		!noSong.value &&
		Number.isInteger(currentSong.value.skipVotes) &&
		currentSong.value.skipVotes >= 0
);
const ratingsLoaded = computed(
	() =>
		!noSong.value &&
		Number.isInteger(currentSong.value.likes) &&
		Number.isInteger(currentSong.value.dislikes) &&
		currentSong.value.likes >= 0 &&
		currentSong.value.dislikes >= 0
);
const ownRatingsLoaded = computed(
	() =>
		!noSong.value &&
		typeof currentSong.value.liked === "boolean" &&
		typeof currentSong.value.disliked === "boolean"
);
const aModalIsOpen = computed(() => Object.keys(activeModals.value).length > 0);
const currentUserQueueSongs = computed(
	() =>
		songsList.value.filter(
			queueSong => queueSong.requestedBy === userId.value
		).length
);

const stationState = computed(() => {
	if (noSong.value) return "no_song";
	if (stationPaused.value) return "station_paused";
	if (
		experimentalChangableListenModeEnabled.value &&
		experimentalChangableListenMode.value === "participate"
	)
		return "participate";
	if (localPaused.value || autoPaused.value) return "local_paused";
	if (volumeSliderValue.value === 0 || muted.value) return "muted";
	if (youtubePlayerReady.value && youtubePlayerState.value === "PLAYING")
		return "playing";
	if (youtubePlayerReady.value && youtubePlayerState.value === "BUFFERING")
		return "buffering";
	return "unknown";
});

const currentSongMediaType = computed(() => {
	if (
		!currentSong.value ||
		!currentSong.value.mediaSource ||
		currentSong.value.mediaSource.indexOf(":") === -1
	)
		return "none";
	return currentSong.value.mediaSource.split(":")[0];
});
const currentSongMediaValue = computed(() => {
	if (
		!currentSong.value ||
		!currentSong.value.mediaSource ||
		currentSong.value.mediaSource.indexOf(":") === -1
	)
		return null;
	return currentSong.value.mediaSource.split(":")[1];
});

const currentYoutubeId = computed(() => {
	if (
		!currentSong.value ||
		!currentSong.value.mediaSource.startsWith("youtube:")
	)
		return null;
	return currentSong.value.mediaSource.split(":")[1];
});

const currentSongIsYoutube = computed(() => {
	if (
		!currentSong.value ||
		!currentSong.value.mediaSource.startsWith("youtube:")
	)
		return false;
	return true;
});

const {
	joinStation,
	leaveStation,
	updateStation,
	updateUserCount,
	updateUsers,
	updateCurrentSong,
	updateNextSong,
	updateSongsList,
	repositionSongInList,
	updateStationPaused,
	updateLocalPaused,
	updateNoSong,
	updateIfStationIsFavorited,
	setAutofillPlaylists,
	setBlacklist,
	updateCurrentSongRatings,
	updateOwnCurrentSongRatings,
	updateCurrentSongSkipVotes,
	updateAutoRequestLock,
	updateAutorequestLocalStorage,
	hasPermission,
	addDj,
	removeDj,
	updatePermissions,
	addHistoryItem,
	setHistory
} = stationStore;

// TODO fix this if it still has some use
// const stopVideo = payload =>
// 	store.dispatch("modals/editSong/stopVideo", payload);

const recentlyPlayedYoutubeIds = (max: number) => {
	const mediaSources = new Set();

	history.value.forEach((historyItem, index) => {
		if (index < max) mediaSources.add(historyItem.payload.song.mediaSource);
	});

	return Array.from(mediaSources);
};

const updateMediaSessionData = song => {
	if (song) {
		ms.setMediaSessionData(
			0,
			!localPaused.value && !stationPaused.value && !autoPaused.value, // This should be improved later
			song.title,
			song.artists ? song.artists.join(", ") : null,
			null,
			song.thumbnail ||
				`https://img.youtube.com/vi/${song.youtubeId}/mqdefault.jpg`
		);
	} else ms.removeMediaSessionData(0);
};
const autoRequestSong = () => {
	const {
		limit,
		allowAutorequest,
		autorequestLimit,
		autorequestDisallowRecentlyPlayedEnabled,
		autorequestDisallowRecentlyPlayedNumber
	} = station.value.requests;

	if (autoRequestLock.value) return;
	if (!allowAutorequest) return;
	if (autoRequest.value.length === 0) return;

	updateAutorequestLocalStorage();

	if (currentUserQueueSongs.value >= limit) return;
	if (currentUserQueueSongs.value >= autorequestLimit) return;
	if (songsList.value.length >= 50) return;

	let excludedYoutubeIds = [];
	if (autorequestDisallowRecentlyPlayedEnabled) {
		excludedYoutubeIds = recentlyPlayedYoutubeIds(
			autorequestDisallowRecentlyPlayedNumber
		);
	}

	if (songsList.value) {
		songsList.value.forEach(song => {
			excludedYoutubeIds.push(song.mediaSource);
		});
	}

	if (!noSong.value) {
		excludedYoutubeIds.push(currentSong.value.mediaSource);
	}

	const uniqueYoutubeIds = new Set();

	autoRequest.value.forEach(playlist => {
		playlist.songs.forEach(song => {
			if (
				excludedYoutubeIds.indexOf(song.mediaSource) === -1 &&
				!song.mediaSource.startsWith("spotify:")
			)
				uniqueYoutubeIds.add(song.mediaSource);
		});
	});

	if (uniqueYoutubeIds.size > 0) {
		const mediaSource = Array.from(uniqueYoutubeIds.values())[
			Math.floor(Math.random() * uniqueYoutubeIds.size)
		];
		updateAutoRequestLock(true);
		socket.dispatch(
			"stations.addToQueue",
			station.value._id,
			mediaSource,
			"autorequest",
			data => {
				updateAutoRequestLock(false);
				if (data.status !== "success") {
					setTimeout(
						() => {
							autoRequestSong();
						},
						data.message === "That song is already in the queue."
							? 5000
							: 1000
					);
				}
			}
		);
	}
};
const dateCurrently = () => new Date().getTime() + systemDifference.value;
const getTimeElapsed = () => {
	if (currentSong.value) {
		let localTimePaused = timePaused.value;
		if (stationPaused.value)
			localTimePaused += dateCurrently() - pausedAt.value;
		return dateCurrently() - startedAt.value - localTimePaused;
	}
	return 0;
};
const getTimeRemaining = () => {
	if (currentSong.value) {
		return currentSong.value.duration * 1000 - getTimeElapsed();
	}
	return 0;
};
const getCurrentPlayerTime = () =>
	new Promise<number>((resolve, reject) => {
		if (
			currentSongMediaType.value === "youtube" &&
			youtubePlayerReady.value
		) {
			resolve(
				Math.max(
					youtubePlayer.value.getCurrentTime() -
						currentSong.value.skipDuration,
					0
				) * 1000
			);
			return;
		}

		if (currentSongMediaType.value === "soundcloud") {
			soundcloudGetPosition(position => {
				resolve(
					Math.max(
						position / 1000 - currentSong.value.skipDuration,
						0
					) * 1000
				);
			});
			return;
		}

		resolve(0);
	});
const skipSong = () => {
	if (nextCurrentSong.value && nextCurrentSong.value.currentSong) {
		const _songsList = songsList.value.concat([]);
		if (
			_songsList.length > 0 &&
			_songsList[0].mediaSource ===
				nextCurrentSong.value.currentSong.mediaSource
		) {
			_songsList.splice(0, 1);
			updateSongsList(_songsList);
		}
		// TODO fix
		// eslint-disable-next-line
		setCurrentSong(nextCurrentSong.value);
	} else {
		// TODO fix
		// eslint-disable-next-line
		setCurrentSong({
			currentSong: null,
			startedAt: 0,
			paused: stationPaused.value,
			timePaused: 0,
			pausedAt: 0
		});
	}
};
const setNextCurrentSong = (_nextCurrentSong, skipSkipCheck = false) => {
	nextCurrentSong.value = _nextCurrentSong;
	// If skipSkipCheck is true, it won't try to skip the song
	if (getTimeRemaining() <= 0 && !skipSkipCheck) {
		skipSong();
	}
};
const resizeSeekerbar = () => {
	seekerbarPercentage.value =
		(getTimeElapsed() / 1000 / currentSong.value.duration) * 100;
};
const calculateTimeElapsed = async () => {
	if (experimentalChangableListenMode.value === "participate") return;
	if (
		youtubePlayerReady.value &&
		currentSongMediaType.value === "youtube" &&
		!noSong.value &&
		currentSong.value &&
		youtubePlayer.value.getPlayerState() === -1
	) {
		if (!canAutoplay.value) {
			if (Date.now() - lastTimeRequestedIfCanAutoplay.value > 2000) {
				lastTimeRequestedIfCanAutoplay.value = Date.now();
				canAutoPlay.video().then(({ result }) => {
					if (result) {
						attemptsToPlayVideo.value = 0;
						canAutoplay.value = true;
					} else {
						canAutoplay.value = false;
					}
				});
			}
		} else {
			youtubePlayer.value.playVideo();
			attemptsToPlayVideo.value += 1;
		}
	}

	if (
		!stationPaused.value &&
		!localPaused.value &&
		!autoPaused.value &&
		!isApple.value
	) {
		const timeElapsed = getTimeElapsed();
		const currentPlayerTime = await getCurrentPlayerTime();

		const difference = timeElapsed - currentPlayerTime;

		let _playbackRate = 1;

		if (difference < -2000) {
			if (!seeking.value) {
				seeking.value = true;
				playerSeekTo(
					getTimeElapsed() / 1000 + currentSong.value.skipDuration
				);
			}
		} else if (difference < -200) {
			_playbackRate = 0.8;
		} else if (difference < -50) {
			_playbackRate = 0.9;
		} else if (difference < -25) {
			_playbackRate = 0.95;
		} else if (difference > 2000) {
			if (!seeking.value) {
				seeking.value = true;
				playerSeekTo(
					getTimeElapsed() / 1000 + currentSong.value.skipDuration
				);
			}
		} else if (difference > 200) {
			_playbackRate = 1.2;
		} else if (difference > 50) {
			_playbackRate = 1.1;
		} else if (difference > 25) {
			_playbackRate = 1.05;
		} else if (
			currentSongMediaType.value === "youtube" &&
			youtubeReady.value &&
			youtubePlayer.value.getPlaybackRate !== 1.0
		) {
			youtubePlayer.value.setPlaybackRate(1.0);
		}

		if (
			currentSongMediaType.value === "youtube" &&
			youtubeReady.value &&
			playbackRate.value !== _playbackRate
		) {
			youtubePlayer.value.setPlaybackRate(_playbackRate);
			playbackRate.value = _playbackRate;
		}
	}

	let localTimePaused = timePaused.value;
	if (stationPaused.value)
		localTimePaused += dateCurrently() - pausedAt.value;

	const duration =
		(dateCurrently() - startedAt.value - localTimePaused) / 1000;

	const songDuration = currentSong.value.duration;
	if (youtubePlayerReady.value && songDuration <= duration) playerPause();
	if (duration <= songDuration)
		timeElapsed.value =
			typeof duration === "number" ? utils.formatTime(duration) : "0";
};
const playVideo = () => {
	console.debug(TAG, "Play video start");
	if (currentSongMediaType.value === "youtube") {
		if (youtubePlayerReady.value) {
			videoLoading.value = true;
			youtubePlayer.value.loadVideoById(
				currentYoutubeId.value,
				getTimeElapsed() / 1000 + currentSong.value.skipDuration
			);
		}
	} else if (currentSongMediaType.value === "soundcloud") {
		const soundcloudId = currentSongMediaValue.value;

		soundcloudLoadTrack(
			soundcloudId,
			getTimeElapsed() / 1000 + currentSong.value.skipDuration,
			localPaused.value || stationPaused.value
		);
	}

	if (window.stationInterval !== 0) clearInterval(window.stationInterval);
	window.stationInterval = window.setInterval(() => {
		if (!stationPaused.value) {
			resizeSeekerbar();
			calculateTimeElapsed();
		}
	}, 150);
	console.debug(TAG, "Play video end");
};
const changeSoundcloudPlayerVolume = () => {
	if (muted.value) soundcloudSetVolume(0);
	else soundcloudSetVolume(volumeSliderValue.value);
};
const changePlayerVolume = () => {
	if (youtubePlayerReady.value) {
		youtubePlayer.value.setVolume(volumeSliderValue.value);
		if (muted.value) youtubePlayer.value.mute();
		else youtubePlayer.value.unMute();
	}

	changeSoundcloudPlayerVolume();
};
const playerPlay = () => {
	console.debug(
		TAG,
		"PLAYER PLAY",
		currentSongMediaType.value,
		youtubePlayerReady.value
	);
	if (currentSongMediaType.value === "youtube" && youtubePlayerReady.value) {
		youtubePlayer.value.playVideo();
	}

	if (currentSongMediaType.value === "soundcloud") {
		soundcloudPlay();
	}
};
const playerStop = () => {
	if (youtubePlayerReady.value) {
		youtubePlayer.value.stopVideo();
	}

	autoPaused.value = false;

	soundcloudDestroy();
};
const playerPause = () => {
	if (youtubePlayerReady.value) {
		youtubePlayer.value.pauseVideo();
	}

	soundcloudPause();
};
const playerSeekTo = position => {
	console.debug("PLAYER SEEK TO", position);

	// Position is in seconds
	if (currentSongMediaType.value === "youtube" && youtubePlayerReady.value) {
		youtubePlayer.value.seekTo(position);
	}

	if (currentSongMediaType.value === "soundcloud") {
		soundcloudSeekTo(position * 1000);
	}
};
const toggleSkipVote = (message?) => {
	socket.dispatch("stations.toggleSkipVote", station.value._id, data => {
		if (data.status !== "success") new Toast(`Error: ${data.message}`);
		else
			new Toast(
				message || "Successfully toggled vote to skip the current song."
			);
	});
};
const youtubeReady = () => {
	if (experimentalChangableListenMode.value === "participate") return;
	if (!youtubePlayer.value) {
		ms.setYTReady(false);
		youtubePlayer.value = new window.YT.Player("youtubeStationPlayer", {
			height: 270,
			width: 480,
			// TODO CHECK TYPE
			videoId: currentYoutubeId.value,
			host: "https://www.youtube-nocookie.com",
			startSeconds:
				getTimeElapsed() / 1000 + currentSong.value.skipDuration,
			playerVars: {
				controls: 0,
				iv_load_policy: 3,
				rel: 0,
				showinfo: 0,
				disablekb: 1,
				playsinline: 1
			},
			events: {
				onReady: () => {
					youtubePlayerReady.value = true;
					ms.setYTReady(true);

					changePlayerVolume();

					playVideo();

					const duration =
						(dateCurrently() - startedAt.value - timePaused.value) /
						1000;
					const songDuration = currentSong.value.duration;
					if (songDuration <= duration)
						youtubePlayer.value.pauseVideo();

					// on ios, playback will be forcibly paused locally
					if (isApple.value) {
						updateLocalPaused(true);
						new Toast(
							`Please click play manually to use ${configStore.get(
								"sitename"
							)} on iOS.`
						);
					}
				},
				onError: err => {
					console.log("error with youtube video", err);

					if (err.data === 150 && loggedIn.value) {
						if (
							!(
								localPaused.value ||
								stationPaused.value ||
								autoPaused.value
							) &&
							!currentSong.value.voted
						) {
							// automatically vote to skip
							toggleSkipVote(
								"Automatically voted to skip as this song isn't available for you."
							);
						}

						// persistent message while song is playing
						const persistentToast = new Toast({
							content:
								"This song is unavailable for you, but is playing for everyone else.",
							persistent: true
						});

						// save current song id
						const erroredYoutubeId = currentSong.value.mediaSource;

						persistentToasts.value.push({
							toast: persistentToast,
							checkIfCanRemove: () => {
								if (
									currentSong.value.mediaSource ===
									erroredYoutubeId
								) {
									persistentToast.destroy();
									return true;
								}
								return false;
							}
						});
					} else {
						new Toast(
							"There has been an error with the YouTube Embed"
						);
					}
				},
				onStateChange: event => {
					switch (event.data) {
						case window.YT.PlayerState.UNSTARTED:
							youtubePlayerState.value = "UNSTARTED";
							break;
						case window.YT.PlayerState.ENDED:
							youtubePlayerState.value = "ENDED";
							break;
						case window.YT.PlayerState.PLAYING:
							youtubePlayerState.value = "PLAYING";
							break;
						case window.YT.PlayerState.PAUSED:
							youtubePlayerState.value = "PAUSED";
							break;
						case window.YT.PlayerState.BUFFERING:
							youtubePlayerState.value = "BUFFERING";
							break;
						case window.YT.PlayerState.CUED:
							youtubePlayerState.value = "CUED";
							break;
						default:
							youtubePlayerState.value = null;
					}

					if (
						event.data === window.YT.PlayerState.PLAYING &&
						(noSong.value ||
							currentSongMediaType.value !== "youtube")
					) {
						youtubePlayer.value.stopVideo();
					} else if (
						event.data === window.YT.PlayerState.PLAYING &&
						videoLoading.value === true
					) {
						videoLoading.value = false;
						youtubePlayer.value.seekTo(
							getTimeElapsed() / 1000 +
								currentSong.value.skipDuration,
							true
						);
						canAutoplay.value = true;
						if (stationPaused.value)
							youtubePlayer.value.pauseVideo();
						else if (localPaused.value) {
							resumeLocalStation();
						}
					} else if (
						event.data === window.YT.PlayerState.PLAYING &&
						(localPaused.value || stationPaused.value)
					) {
						youtubePlayer.value.seekTo(
							timeBeforePause.value / 1000,
							true
						);
						if (stationPaused.value)
							youtubePlayer.value.pauseVideo();
						else resumeLocalStation();
					} else if (
						event.data === window.YT.PlayerState.PLAYING &&
						seeking.value === true
					)
						seeking.value = false;

					if (
						event.data === window.YT.PlayerState.PAUSED &&
						!localPaused.value &&
						!stationPaused.value &&
						!noSong.value &&
						currentSongMediaType.value === "youtube" &&
						youtubePlayer.value.getDuration() / 1000 <
							currentSong.value.duration
					) {
						youtubePlayer.value.seekTo(
							getTimeElapsed() / 1000 +
								currentSong.value.skipDuration,
							true
						);
						pauseLocalStation();
					}
				}
			}
		});
	}
};
const setCurrentSong = data => {
	console.debug(TAG, "Set current song start");

	const {
		currentSong: _currentSong,
		startedAt: _startedAt,
		paused: _paused,
		timePaused: _timePaused,
		pausedAt: _pausedAt
	} = data;

	if (_currentSong) {
		if (!_currentSong.skipDuration || _currentSong.skipDuration < 0)
			_currentSong.skipDuration = 0;
		if (!_currentSong.duration || _currentSong.duration < 0)
			_currentSong.duration = 0;
	}

	updateCurrentSong(_currentSong || {});

	let nextSong = null;
	if (songsList.value[0])
		nextSong = songsList.value[0].mediaSource ? songsList.value[0] : null;

	updateNextSong(nextSong);
	setNextCurrentSong(
		{
			currentSong: null,
			startedAt: 0,
			_paused,
			timePaused: 0,
			pausedAt: 0
		},
		true
	);

	clearTimeout(window.stationNextSongTimeout);

	if (configStore.get("experimental.media_session"))
		updateMediaSessionData(_currentSong);

	startedAt.value = _startedAt;
	updateStationPaused(_paused);
	timePaused.value = _timePaused;
	pausedAt.value = _pausedAt;

	playerStop();

	if (_currentSong) {
		updateNoSong(false);

		if (currentSongMediaType.value === "youtube") {
			if (!youtubePlayerReady.value) youtubeReady();
			else playVideo();
		} else if (currentSongMediaType.value === "soundcloud") {
			playVideo();
		}

		// If the station is playing and the backend is not connected, set the next song to skip to after this song and set a timer to skip
		if (!stationPaused.value && !socket.ready) {
			if (nextSong)
				setNextCurrentSong(
					{
						currentSong: nextSong,
						startedAt: Date.now() + getTimeRemaining(),
						paused: false,
						timePaused: 0
					},
					true
				);
			else
				setNextCurrentSong(
					{
						currentSong: null,
						startedAt: 0,
						paused: false,
						timePaused: 0,
						pausedAt: 0
					},
					true
				);
			window.stationNextSongTimeout = setTimeout(() => {
				if (
					!noSong.value &&
					_currentSong.value._id === _currentSong._id
				)
					skipSong();
			}, getTimeRemaining());
		}

		const currentSongId = currentSong.value._id;

		socket.dispatch(
			"stations.getSkipVotes",
			station.value._id,
			currentSongId,
			res => {
				if (res.status === "success") {
					const { skipVotes, skipVotesCurrent, voted } = res.data;
					if (
						!noSong.value &&
						currentSong.value._id === currentSongId
					) {
						updateCurrentSongSkipVotes({
							skipVotes,
							skipVotesCurrent,
							voted
						});
					}
				}
			}
		);

		socket.dispatch("media.getRatings", _currentSong.mediaSource, res => {
			if (_currentSong.mediaSource === currentSong.value.mediaSource) {
				const { likes, dislikes } = res.data;
				updateCurrentSongRatings({ likes, dislikes });
			}
		});

		if (loggedIn.value) {
			socket.dispatch(
				"media.getOwnRatings",
				_currentSong.mediaSource,
				res => {
					console.log("getOwnSongRatings", res);
					if (
						res.status === "success" &&
						currentSong.value.mediaSource === res.data.mediaSource
					) {
						updateOwnCurrentSongRatings(res.data);

						if (
							autoSkipDisliked.value &&
							res.data.disliked === true &&
							!(
								localPaused.value ||
								stationPaused.value ||
								autoPaused.value
							) &&
							!currentSong.value.voted
						) {
							toggleSkipVote(
								"Automatically voted to skip disliked song."
							);
						}
					}
				}
			);
		}
	} else {
		updateNoSong(true);
	}

	calculateTimeElapsed();
	resizeSeekerbar();

	console.debug(TAG, "Set current song end");
};
const changeVolume = () => {
	const volume = volumeSliderValue.value;
	localStorage.setItem("volume", `${volume}`);
	muted.value = volume <= 0;
	localStorage.setItem("muted", `${muted.value}`);

	changePlayerVolume();
};
const resumeLocalPlayer = () => {
	if (configStore.get("experimental.media_session"))
		updateMediaSessionData(currentSong.value);
	if (!noSong.value) {
		playerSeekTo(getTimeElapsed() / 1000 + currentSong.value.skipDuration);
		playerPlay();
	}
};
const pauseLocalPlayer = () => {
	if (configStore.get("experimental.media_session"))
		updateMediaSessionData(currentSong.value);
	if (!noSong.value) {
		timeBeforePause.value = getTimeElapsed();
		playerPause();
	}
};
const resumeLocalStation = () => {
	updateLocalPaused(false);
	autoPaused.value = false;
	if (!stationPaused.value) resumeLocalPlayer();
};
const pauseLocalStation = () => {
	updateLocalPaused(true);
	pauseLocalPlayer();
};
const skipStation = () => {
	socket.dispatch("stations.forceSkip", station.value._id, data => {
		if (data.status !== "success") new Toast(`Error: ${data.message}`);
		else new Toast("Successfully skipped the station's current song.");
	});
};
const resumeStation = () => {
	socket.dispatch("stations.resume", station.value._id, data => {
		if (data.status !== "success") new Toast(`Error: ${data.message}`);
		else new Toast("Successfully resumed the station.");
	});
};
const pauseStation = () => {
	socket.dispatch("stations.pause", station.value._id, data => {
		if (data.status !== "success") new Toast(`Error: ${data.message}`);
		else new Toast("Successfully paused the station.");
	});
};
const toggleMute = () => {
	muted.value = !muted.value;

	changePlayerVolume();
};
const increaseVolume = () => {
	const previousVolume = parseFloat(localStorage.getItem("volume"));
	let volume = previousVolume + 5;
	if (previousVolume === 0) {
		muted.value = false;
		localStorage.setItem("muted", "false");
	}
	if (volume > 100) volume = 100;
	volumeSliderValue.value = volume;
	localStorage.setItem("volume", `${volume}`);

	changePlayerVolume();
};
const toggleLike = () => {
	if (currentSong.value.liked)
		socket.dispatch("media.unlike", currentSong.value.mediaSource, res => {
			if (res.status !== "success") new Toast(`Error: ${res.message}`);
		});
	else
		socket.dispatch("media.like", currentSong.value.mediaSource, res => {
			if (res.status !== "success") new Toast(`Error: ${res.message}`);
		});
};
const toggleDislike = () => {
	if (currentSong.value.disliked)
		return socket.dispatch(
			"media.undislike",
			currentSong.value.mediaSource,
			res => {
				if (res.status !== "success")
					new Toast(`Error: ${res.message}`);
			}
		);

	return socket.dispatch(
		"media.dislike",
		currentSong.value.mediaSource,
		res => {
			if (res.status !== "success") new Toast(`Error: ${res.message}`);
		}
	);
};
const togglePlayerDebugBox = () => {
	playerDebugBox.value.toggleBox();
};
const resetPlayerDebugBox = () => {
	playerDebugBox.value.resetBox();
};
const toggleKeyboardShortcutsHelper = () => {
	keyboardShortcutsHelper.value.toggleBox();
};
const resetKeyboardShortcutsHelper = () => {
	keyboardShortcutsHelper.value.resetBox();
};
const sendActivityWatchMediaData = () => {
	// TODO have this support soundcloud
	if (
		!autoPaused.value &&
		!stationPaused.value &&
		(!localPaused.value ||
			experimentalChangableListenMode.value === "participate") &&
		!noSong.value &&
		(experimentalChangableListenMode.value === "participate" ||
			currentSongMediaType.value !== "youtube" ||
			youtubePlayer.value.getPlayerState() ===
				window.YT.PlayerState.PLAYING)
	) {
		if (activityWatchMediaLastStatus.value !== "playing") {
			activityWatchMediaLastStatus.value = "playing";
			activityWatchMediaLastStartDuration.value =
				currentSong.value.skipDuration + getTimeElapsed();
		}

		if (
			activityWatchMediaLastMediaSource.value !==
			currentSong.value.mediaSource
		) {
			activityWatchMediaLastMediaSource.value =
				currentSong.value.mediaSource;
			activityWatchMediaLastStartDuration.value =
				currentSong.value.skipDuration + getTimeElapsed();
		}

		const videoData = {
			title: currentSong.value ? currentSong.value.title : null,
			artists:
				currentSong.value && currentSong.value.artists
					? currentSong.value.artists.join(", ")
					: null,
			mediaSource: currentSong.value.mediaSource,
			muted: muted.value,
			volume: volumeSliderValue.value,
			startedDuration:
				activityWatchMediaLastStartDuration.value <= 0
					? 0
					: Math.floor(
							activityWatchMediaLastStartDuration.value / 1000
					  ),
			source: `station#${station.value.name}`,
			hostname: window.location.hostname,
			experimentalChangableListenMode:
				experimentalChangableListenMode.value,
			playerState: "",
			playbackRate: -1
		};

		if (currentSongMediaType.value === "youtube") {
			videoData.playerState =
				experimentalChangableListenMode.value === "participate"
					? "none"
					: Object.keys(window.YT.PlayerState).find(
							key =>
								window.YT.PlayerState[key] ===
								youtubePlayer.value.getPlayerState()
					  );

			videoData.playbackRate = playbackRate.value;
		} else {
			delete videoData.playerState;
			delete videoData.playbackRate;
		}

		const success = aw.sendMediaData(videoData);
		if (!success) pauseLocalStation();
	} else {
		activityWatchMediaLastStatus.value = "not_playing";
	}
};

const experimentalChangableListenModeChange = newMode => {
	experimentalChangableListenMode.value = newMode;
	localStorage.setItem(
		`experimental_changeable_listen_mode_${station.value._id}`,
		newMode
	);

	if (newMode === "participate") {
		// Destroy the YouTube player
		if (youtubePlayer.value) {
			youtubePlayer.value.destroy();
			youtubePlayer.value = null;
			youtubePlayerReady.value = false;
			youtubePlayerState.value = null;
		}

		autoPaused.value = false;

		soundcloudDestroy();
	} else {
		// Recreate the YouTube player
		youtubeReady();
	}
};

watch(
	() => autoRequest.value.length,
	() => {
		autoRequestSong();
	}
);

onMounted(async () => {
	console.debug(TAG, "On mounted start");

	mediaModalWatcher.value = stationStore.$onAction(({ name, args }) => {
		if (name === "updateMediaModalPlayingAudio") {
			const [mediaModalPlayingAudio] = args;

			if (mediaModalPlayingAudio) {
				if (!beforeMediaModalLocalPausedLock.value) {
					beforeMediaModalLocalPausedLock.value = true;
					beforeMediaModalLocalPaused.value = localPaused.value;
					pauseLocalStation();
				}
			} else {
				beforeMediaModalLocalPausedLock.value = false;
				if (!beforeMediaModalLocalPaused.value) resumeLocalStation();
			}
		}
	});

	document.body.scrollTo(0, 0);

	stationIdentifier.value = route.params.id;

	window.stationInterval = 0;
	activityWatchMediaDataInterval.value = setInterval(() => {
		sendActivityWatchMediaData();
	}, 1000);
	reportStationStateInterval.value = setInterval(() => {
		socket.dispatch(
			"stations.setStationState",
			stationState.value,
			() => {}
		);
	}, 5000);
	persistentToastCheckerInterval.value = setInterval(() => {
		persistentToasts.value.filter(
			persistentToast => !persistentToast.checkIfCanRemove()
		);
	}, 1000);

	const experimental = configStore.get("experimental");

	socket.onConnect(() => {
		console.debug(TAG, "On socked connect start");

		clearTimeout(window.stationNextSongTimeout);

		socket.dispatch("stations.join", stationIdentifier.value, async res => {
			if (res.status === "success") {
				console.debug(TAG, "Station join start");
				setTimeout(() => {
					loading.value = false;
				}, 1000); // prevents popping in of youtube embed etc.

				const {
					_id,
					displayName,
					name,
					description,
					privacy,
					owner,
					autofill,
					blacklist,
					type,
					isFavorited,
					theme,
					requests,
					djs
				} = res.data;

				if (experimental && experimental.changable_listen_mode) {
					if (experimental.changable_listen_mode === true)
						experimentalChangableListenModeEnabled.value = true;
					else if (
						Array.isArray(experimental.changable_listen_mode) &&
						experimental.changable_listen_mode.indexOf(_id) !== -1
					)
						experimentalChangableListenModeEnabled.value = true;
				}
				if (experimentalChangableListenModeEnabled.value) {
					console.log(
						`Experimental changeable listen mode is enabled`
					);
					const experimentalChangeableListenModeLS =
						localStorage.getItem(
							`experimental_changeable_listen_mode_${_id}`
						);
					if (experimentalChangeableListenModeLS)
						experimentalChangableListenMode.value =
							experimentalChangeableListenModeLS;
				}

				// change url to use station name instead of station id
				if (name !== stationIdentifier.value) {
					// eslint-disable-next-line no-restricted-globals
					router.replace(name);
				}

				joinStation({
					_id,
					name,
					displayName,
					description,
					privacy,
					owner,
					autofill,
					blacklist,
					type,
					isFavorited,
					theme,
					requests,
					djs
				});

				document.getElementsByTagName(
					"html"
				)[0].style.cssText = `--primary-color: var(--${res.data.theme})`;

				setCurrentSong({
					currentSong: res.data.currentSong,
					startedAt: res.data.startedAt,
					paused: res.data.paused,
					timePaused: res.data.timePaused,
					pausedAt: res.data.pausedAt
				});

				updateUserCount(res.data.userCount);
				updateUsers(res.data.users);

				await updatePermissions();

				socket.dispatch(
					"stations.getStationAutofillPlaylistsById",
					station.value._id,
					res => {
						if (res.status === "success") {
							setAutofillPlaylists(res.data.playlists);
						}
					}
				);

				socket.dispatch(
					"stations.getStationBlacklistById",
					station.value._id,
					res => {
						if (res.status === "success") {
							setBlacklist(res.data.playlists);
						}
					}
				);

				socket.dispatch("stations.getQueue", _id, res => {
					if (res.status === "success") {
						const { queue } = res.data;
						updateSongsList(queue);
						const [nextSong] = queue;

						updateNextSong(nextSong);
					}
				});

				if (configStore.get("experimental.station_history"))
					socket.dispatch("stations.getHistory", _id, res => {
						if (res.status === "success") {
							const { history } = res.data;
							setHistory(history);
						}
					});

				if (hasPermission("stations.playback.toggle"))
					keyboardShortcuts.registerShortcut("station.pauseResume", {
						keyCode: 32, // Spacebar
						shift: false,
						ctrl: true,
						preventDefault: true,
						handler: () => {
							if (aModalIsOpen.value) return;
							if (stationPaused.value) resumeStation();
							else pauseStation();
						}
					});

				if (hasPermission("stations.skip"))
					keyboardShortcuts.registerShortcut("station.skipStation", {
						keyCode: 39, // Right arrow key
						shift: false,
						ctrl: true,
						preventDefault: true,
						handler: () => {
							if (aModalIsOpen.value) return;
							skipStation();
						}
					});

				keyboardShortcuts.registerShortcut("station.lowerVolumeLarge", {
					keyCode: 40, // Down arrow key
					shift: false,
					ctrl: true,
					preventDefault: true,
					handler: () => {
						if (aModalIsOpen.value) return;
						volumeSliderValue.value -= 10;
						changeVolume();
					}
				});

				keyboardShortcuts.registerShortcut("station.lowerVolumeSmall", {
					keyCode: 40, // Down arrow key
					shift: true,
					ctrl: true,
					preventDefault: true,
					handler: () => {
						if (aModalIsOpen.value) return;
						volumeSliderValue.value -= 1;
						changeVolume();
					}
				});

				keyboardShortcuts.registerShortcut(
					"station.increaseVolumeLarge",
					{
						keyCode: 38, // Up arrow key
						shift: false,
						ctrl: true,
						preventDefault: true,
						handler: () => {
							if (aModalIsOpen.value) return;
							volumeSliderValue.value += 10;
							changeVolume();
						}
					}
				);

				keyboardShortcuts.registerShortcut(
					"station.increaseVolumeSmall",
					{
						keyCode: 38, // Up arrow key
						shift: true,
						ctrl: true,
						preventDefault: true,
						handler: () => {
							if (aModalIsOpen.value) return;
							volumeSliderValue.value += 1;
							changeVolume();
						}
					}
				);

				keyboardShortcuts.registerShortcut("station.toggleDebug", {
					keyCode: 68, // D key
					shift: false,
					ctrl: true,
					preventDefault: true,
					handler: () => {
						if (aModalIsOpen.value) return;
						togglePlayerDebugBox();
					}
				});

				keyboardShortcuts.registerShortcut(
					"station.toggleKeyboardShortcutsHelper",
					{
						keyCode: 191, // '/' key
						ctrl: true,
						preventDefault: true,
						handler: () => {
							if (aModalIsOpen.value) return;
							toggleKeyboardShortcutsHelper();
						}
					}
				);

				keyboardShortcuts.registerShortcut(
					"station.resetKeyboardShortcutsHelper",
					{
						keyCode: 191, // '/' key
						ctrl: true,
						shift: true,
						preventDefault: true,
						handler: () => {
							if (aModalIsOpen.value) return;
							resetKeyboardShortcutsHelper();
						}
					}
				);

				// UNIX client time before ping
				const beforePing = Date.now();
				socket.dispatch("apis.ping", res => {
					if (res.status === "success") {
						// UNIX client time after ping
						const afterPing = Date.now();
						// Average time in MS it took between the server responding and the client receiving
						const connectionLatency = (afterPing - beforePing) / 2;
						console.log(connectionLatency, beforePing - afterPing);
						// UNIX server time
						const serverDate = res.data.date;
						// Difference between the server UNIX time and the client UNIX time after ping, with the connectionLatency added to the server UNIX time
						const difference =
							serverDate + connectionLatency - afterPing;
						console.log("Difference: ", difference);
						if (difference > 3000 || difference < -3000) {
							console.log(
								"System time difference is bigger than 3 seconds."
							);
						}
						systemDifference.value = difference;
					}
				});
				console.debug(TAG, "Station join end");
			} else {
				loading.value = false;
				exists.value = false;
			}
		});

		socket.dispatch(
			"stations.existsByName",
			stationIdentifier.value,
			res => {
				if (res.status === "error" || !res.data.exists) {
					// station identifier may be using stationid instead
					socket.dispatch(
						"stations.existsById",
						stationIdentifier.value,
						res => {
							if (res.status === "error" || !res.data.exists) {
								loading.value = false;
								exists.value = false;
							}
						}
					);
				}
			}
		);

		console.debug(TAG, "On socked connect end");
	});

	socket.onDisconnect(() => {
		const _currentSong = currentSong.value;
		if (nextSong.value)
			setNextCurrentSong(
				{
					currentSong: nextSong.value,
					startedAt: Date.now() + getTimeRemaining(),
					paused: false,
					timePaused: 0
				},
				true
			);
		else
			setNextCurrentSong(
				{
					currentSong: null,
					startedAt: 0,
					paused: false,
					timePaused: 0,
					pausedAt: 0
				},
				true
			);
		window.stationNextSongTimeout = setTimeout(() => {
			if (!noSong.value && currentSong.value._id === _currentSong._id)
				skipSong();
		}, getTimeRemaining());
	}, true);

	socket.on("event:station.nextSong", res => {
		const { currentSong, startedAt, paused, timePaused } = res.data;

		setCurrentSong({
			currentSong,
			startedAt,
			paused,
			timePaused,
			pausedAt: 0
		});
	});

	socket.on("event:station.pause", res => {
		pausedAt.value = res.data.pausedAt;
		updateStationPaused(true);
		pauseLocalPlayer();

		clearTimeout(window.stationNextSongTimeout);
	});

	socket.on("event:station.resume", res => {
		timePaused.value = res.data.timePaused;
		updateStationPaused(false);
		if (!localPaused.value) resumeLocalPlayer();

		autoRequestSong();
	});

	socket.on("event:station.deleted", () => {
		router.push({
			path: "/",
			query: {
				toast: "The station you were in was deleted."
			}
		});
	});

	socket.on("event:ratings.liked", res => {
		if (!noSong.value) {
			if (res.data.mediaSource === currentSong.value.mediaSource) {
				updateCurrentSongRatings(res.data);
			}
		}
	});

	socket.on("event:ratings.disliked", res => {
		if (!noSong.value) {
			if (res.data.mediaSource === currentSong.value.mediaSource) {
				updateCurrentSongRatings(res.data);
			}
		}
	});

	socket.on("event:ratings.unliked", res => {
		if (!noSong.value) {
			if (res.data.mediaSource === currentSong.value.mediaSource) {
				updateCurrentSongRatings(res.data);
			}
		}
	});

	socket.on("event:ratings.undisliked", res => {
		if (!noSong.value) {
			if (res.data.mediaSource === currentSong.value.mediaSource) {
				updateCurrentSongRatings(res.data);
			}
		}
	});

	socket.on("event:ratings.updated", res => {
		if (!noSong.value) {
			if (res.data.mediaSource === currentSong.value.mediaSource) {
				updateOwnCurrentSongRatings(res.data);
			}
		}
	});

	socket.on("event:station.queue.updated", res => {
		updateSongsList(res.data.queue);

		let nextSong = null;
		if (songsList.value[0])
			nextSong = songsList.value[0].mediaSource
				? songsList.value[0]
				: null;

		updateNextSong(nextSong);

		autoRequestSong();
	});

	socket.on("event:station.queue.song.repositioned", res => {
		repositionSongInList(res.data.song);

		let nextSong = null;
		if (songsList.value[0])
			nextSong = songsList.value[0].mediaSource
				? songsList.value[0]
				: null;

		updateNextSong(nextSong);
	});

	socket.on("event:station.toggleSkipVote", res => {
		if (currentSong.value)
			updateCurrentSongSkipVotes({
				skipVotes: res.data.voted
					? currentSong.value.skipVotes + 1
					: currentSong.value.skipVotes - 1,
				skipVotesCurrent: null,
				voted:
					res.data.userId === userId.value
						? res.data.voted
						: currentSong.value.voted
			});
	});

	socket.on("event:station.updated", async res => {
		const { name, theme, privacy } = res.data.station;

		if (!hasPermission("stations.view") && privacy === "private") {
			router.push({
				path: "/",
				query: {
					toast: "The station you were in was made private."
				}
			});
		} else {
			if (station.value.name !== name) {
				await router.push(
					`${name}?${Object.keys(route.query)
						.map(
							key =>
								`${encodeURIComponent(
									key
								)}=${encodeURIComponent(
									JSON.stringify(route.query[key])
								)}`
						)
						.join("&")}`
				);

				// eslint-disable-next-line no-restricted-globals
				history.replaceState({ ...history.state, ...{} }, null);
			}

			if (station.value.theme !== theme)
				document.getElementsByTagName(
					"html"
				)[0].style.cssText = `--primary-color: var(--${theme})`;

			updateStation(res.data.station);
		}
	});

	socket.on("event:station.users.updated", res =>
		updateUsers(res.data.users)
	);

	socket.on("event:station.userCount.updated", res =>
		updateUserCount(res.data.userCount)
	);

	socket.on("event:user.station.favorited", res => {
		if (res.data.stationId === station.value._id)
			updateIfStationIsFavorited({ isFavorited: true });
	});

	socket.on("event:user.station.unfavorited", res => {
		if (res.data.stationId === station.value._id)
			updateIfStationIsFavorited({ isFavorited: false });
	});

	socket.on("event:station.djs.added", res => {
		if (res.data.user._id === userId.value)
			updatePermissions().then(() => {
				if (
					!hasPermission("stations.view") &&
					station.value.privacy === "private"
				)
					router.push({
						path: "/",
						query: {
							toast: "You no longer have access to the station you were in."
						}
					});
			});
		addDj(res.data.user);
	});

	socket.on("event:station.djs.removed", res => {
		if (res.data.user._id === userId.value)
			updatePermissions().then(() => {
				if (
					!hasPermission("stations.view") &&
					station.value.privacy === "private"
				)
					router.push({
						path: "/",
						query: {
							toast: "You no longer have access to the station you were in."
						}
					});
			});
		removeDj(res.data.user);
	});

	socket.on("event:station.history.new", res => {
		addHistoryItem(res.data.historyItem);
	});

	socket.on("keep.event:user.role.updated", () => {
		updatePermissions().then(() => {
			if (
				!hasPermission("stations.view") &&
				station.value.privacy === "private"
			)
				router.push({
					path: "/",
					query: {
						toast: "You no longer have access to the station you were in."
					}
				});
		});
	});

	frontendDevMode.value = process.env.NODE_ENV;

	ms.setListeners(0, {
		play: () => {
			if (hasPermission("stations.playback.toggle")) resumeStation();
			else resumeLocalStation();
		},
		pause: () => {
			if (hasPermission("stations.playback.toggle")) pauseStation();
			else pauseLocalStation();
		},
		nexttrack: () => {
			if (hasPermission("stations.skip")) skipStation();
			else if (!currentSong.value.voted) toggleSkipVote();
		}
	});

	if (JSON.parse(localStorage.getItem("muted"))) {
		muted.value = true;
		volumeSliderValue.value = 0;
	} else {
		let volume = parseFloat(localStorage.getItem("volume"));
		volume =
			typeof volume === "number" && !Number.isNaN(volume) ? volume : 20;
		localStorage.setItem("volume", `${volume}`);
		volumeSliderValue.value = volume;
	}

	changePlayerVolume();

	soundcloudOnTrackStateChange(newState => {
		console.debug(TAG, `New state: ${newState}`);

		if (
			newState === "attempting_to_play" ||
			newState === "failed_to_play"
		) {
			if (currentSongMediaType.value !== "soundcloud") return;
			if (!localPaused.value && !stationPaused.value) {
				if (newState === "failed_to_play")
					new Toast(
						"Failed to start SoundCloud player. Please try to manually start it."
					);

				autoPaused.value = true;
			}
		} else if (newState === "paused") {
			if (currentSongMediaType.value !== "soundcloud") return;
			if (!localPaused.value && !stationPaused.value) {
				pauseLocalStation();
			}
		} else if (newState === "playing") {
			if (currentSongMediaType.value !== "soundcloud") {
				soundcloudDestroy();
				return;
			}

			if (autoPaused.value) {
				autoPaused.value = false;
			}

			if (localPaused.value) resumeLocalStation();

			if (stationPaused.value) {
				soundcloudPause();
			}

			soundcloudSeekTo(
				(getTimeElapsed() / 1000 + currentSong.value.skipDuration) *
					1000
			);
		} else if (newState === "error") {
			autoPaused.value = true;
		}
	});

	soundcloudBindListener("seek", () => {
		console.debug(TAG, "Bind on seek");
		if (seeking.value) seeking.value = false;
	});

	soundcloudBindListener("error", value => {
		console.debug(TAG, "Bind on error", value);
	});

	console.debug(TAG, "On mounted end");
});

onBeforeUnmount(() => {
	document.getElementsByTagName("html")[0].style.cssText = "";

	if (configStore.get("experimental.media_session")) {
		ms.removeListeners(0);
		ms.removeMediaSessionData(0);
	}

	/** Reset Songslist */
	updateSongsList([]);

	const shortcutNames = [
		"station.pauseResume",
		"station.skipStation",
		"station.lowerVolumeLarge",
		"station.lowerVolumeSmall",
		"station.increaseVolumeLarge",
		"station.increaseVolumeSmall",
		"station.toggleDebug"
	];

	shortcutNames.forEach(shortcutName => {
		keyboardShortcuts.unregisterShortcut(shortcutName);
	});

	mediaModalWatcher.value(); // removes the watcher

	clearInterval(activityWatchMediaDataInterval.value);
	clearTimeout(window.stationNextSongTimeout);
	clearTimeout(persistentToastCheckerInterval.value);
	clearInterval(reportStationStateInterval.value);
	persistentToasts.value.forEach(persistentToast => {
		persistentToast.toast.destroy();
	});

	socket.dispatch("stations.leave", station.value._id, () => {});

	const { allowAutorequest } = station.value.requests;

	if (
		!autoRequestLock.value &&
		allowAutorequest &&
		autoRequest.value.length > 0
	)
		updateAutorequestLocalStorage();

	leaveStation();

	soundcloudUnload();

	// Delete the Pinia store that was created for this station, after all other cleanup tasks are performed
	stationStore.$dispose();
});
</script>

<template>
	<div>
		<page-metadata
			v-if="exists && !loading"
			:title="`${station.displayName}`"
		/>
		<page-metadata v-else-if="!exists && !loading" :title="`Not found`" />

		<div id="page-loader-container" v-if="loading">
			<content-loader
				width="1920"
				height="1080"
				:primary-color="nightmode ? '#222' : '#fff'"
				:secondary-color="nightmode ? '#444' : '#ddd'"
				preserve-aspect-ratio="none"
				id="page-loader-content"
			>
				<rect x="55" y="105" rx="5" ry="5" width="670" height="149" />
				<rect x="55" y="283" rx="5" ry="5" width="670" height="640" />
				<rect x="745" y="108" rx="5" ry="5" width="1120" height="672" />
				<rect x="745" y="810" rx="5" ry="5" width="1120" height="110" />
			</content-loader>

			<content-loader
				width="1920"
				height="1080"
				:primary-color="nightmode ? '#222' : '#fff'"
				:secondary-color="nightmode ? '#444' : '#ddd'"
				preserve-aspect-ratio="none"
				id="page-loader-layout"
			>
				<rect x="0" y="0" rx="0" ry="0" width="1920" height="64" />
				<rect x="0" y="980" rx="0" ry="0" width="1920" height="100" />
			</content-loader>
		</div>

		<!-- More simplistic loading animation for mobile users -->
		<div v-show="loading" id="mobile-progress-animation" />

		<ul
			v-if="
				currentSong &&
				(currentSong.mediaSource === 'l9PxOanFjxQ' ||
					currentSong.mediaSource === 'xKVcVSYmesU' ||
					currentSong.mediaSource === '60ItHLz5WEA' ||
					currentSong.mediaSource === 'e6vkFbtSGm0')
			"
			class="bg-bubbles"
		>
			<li></li>
			<li></li>
			<li></li>
			<li></li>
			<li></li>
			<li></li>
			<li></li>
			<li></li>
			<li></li>
			<li></li>
		</ul>

		<div v-show="!loading && exists">
			<main-header />

			<div id="station-outer-container">
				<div
					id="station-inner-container"
					:class="{ 'nothing-here': noSong }"
				>
					<div id="station-left-column" class="column">
						<!-- div with quadrant class -->
						<div class="quadrant">
							<station-info-box
								:station="station"
								:station-paused="stationPaused"
								:show-manage-station="true"
							/>
						</div>
						<div id="sidebar-container" class="quadrant">
							<station-sidebar />
						</div>
					</div>
					<div id="station-right-column" class="column">
						<div
							class="experimental-listen-mode-container quadrant"
							v-if="
								experimentalChangableListenModeEnabled &&
								!noSong
							"
							v-show="
								experimentalChangableListenMode ===
								'participate'
							"
						>
							<button
								class="button is-primary"
								@click="
									experimentalChangableListenModeChange(
										'listen_and_participate'
									)
								"
							>
								<i class="material-icons icon-with-button"
									>music_note</i
								>
								<span>Listen to music</span>
							</button>
							<button
								v-if="!skipVotesLoaded"
								class="button is-primary disabled"
								content="Skip votes have not been loaded yet"
								v-tippy
							>
								<i class="material-icons icon-with-button"
									>skip_next</i
								>
								Vote to skip the current song
							</button>
							<button
								v-else-if="loggedIn"
								:class="[
									'button',
									'is-primary',
									{ voted: currentSong.voted }
								]"
								@click="toggleSkipVote()"
								:content="`${
									currentSong.voted ? 'Remove vote' : 'Vote'
								} to Skip Song`"
								v-tippy
							>
								<i class="material-icons icon-with-button"
									>skip_next</i
								>
								Vote to skip the current song -
								{{ currentSong.skipVotes }} votes
							</button>
							<button
								v-else
								class="button is-primary disabled"
								content="Log in to vote to skip songs"
								v-tippy="{ theme: 'info' }"
							>
								<i class="material-icons icon-with-button"
									>skip_next</i
								>
								Vote to skip the current song -
								{{ currentSong.skipVotes }} votes
							</button>
							<div class="row">
								<!-- Ratings -->
								<div
									class="ratings"
									v-if="ratingsLoaded && ownRatingsLoaded"
									:class="{
										liked: currentSong.liked,
										disliked: currentSong.disliked
									}"
								>
									<!-- Like Song Button -->
									<button
										class="button is-success like-song"
										@click="toggleLike()"
										content="Like Song"
										v-tippy
									>
										<i
											class="material-icons icon-with-button"
											:class="{
												liked: currentSong.liked
											}"
											>thumb_up_alt</i
										>{{ currentSong.likes }}
									</button>

									<!-- Dislike Song Button -->
									<button
										class="button is-danger dislike-song"
										@click="toggleDislike()"
										content="Dislike Song"
										v-tippy
									>
										<i
											class="material-icons icon-with-button"
											:class="{
												disliked: currentSong.disliked
											}"
											>thumb_down_alt</i
										>{{ currentSong.dislikes }}
									</button>
								</div>
								<div id="ratings" class="disabled" v-else>
									<!-- Like Song Button -->
									<button
										class="button is-success like-song disabled"
										content="Ratings have not been loaded yet"
										v-tippy
									>
										<i
											class="material-icons icon-with-button"
											>thumb_up_alt</i
										>
									</button>

									<!-- Dislike Song Button -->
									<button
										class="button is-danger dislike-song disabled"
										content="Ratings have not been loaded yet"
										v-tippy
									>
										<i
											class="material-icons icon-with-button"
											>thumb_down_alt</i
										>
									</button>
								</div>
								<add-to-playlist-dropdown
									:song="currentSong"
									placement="top-end"
								>
									<template #button>
										<div
											id="add-song-to-playlist"
											content="Add Song to Playlist"
											v-tippy
										>
											<div class="control has-addons">
												<button
													class="button is-primary"
												>
													<i class="material-icons">
														playlist_add
													</i>
												</button>
												<button
													class="button"
													id="dropdown-toggle"
												>
													<i class="material-icons">
														{{
															showPlaylistDropdown
																? "expand_more"
																: "expand_less"
														}}
													</i>
												</button>
											</div>
										</div>
									</template>
								</add-to-playlist-dropdown>
							</div>
						</div>
						<div
							class="player-container quadrant"
							v-show="
								!noSong &&
								(!experimentalChangableListenModeEnabled ||
									experimentalChangableListenMode ===
										'listen_and_participate')
							"
						>
							<div id="video-container">
								<div
									v-show="currentSongMediaType === 'youtube'"
								>
									<div
										id="youtubeStationPlayer"
										style="
											width: 100%;
											height: 100%;
											min-height: 200px;
										"
									/>
								</div>
								<iframe
									v-show="
										currentSongMediaType === 'soundcloud'
									"
									id="soundcloudStationPlayer"
									ref="soundcloudIframeElement"
									style="
										width: 100%;
										height: 100%;
										min-height: 200px;
									"
									scrolling="no"
									frameborder="no"
									allow="autoplay"
								></iframe>
								<div
									class="player-cannot-autoplay"
									v-if="!canAutoplay"
									@click="increaseVolume()"
								>
									<p>
										Please click anywhere on the screen for
										the video to start
									</p>
								</div>
							</div>
							<div id="seeker-bar-container">
								<div
									id="seeker-bar"
									:class="{
										'christmas-seeker':
											configStore.get('christmas'),
										nyan:
											currentSong &&
											currentSong.mediaSource ===
												'youtube:QH2-TGUlwu4'
									}"
								/>
								<div
									class="seeker-bar-cover"
									:style="{
										width: `calc(100% - ${seekerbarPercentage}%)`
									}"
								></div>
								<img
									v-if="
										currentSong &&
										currentSong.mediaSource ===
											'youtube:QH2-TGUlwu4'
									"
									src="https://freepngimg.com/thumb/nyan_cat/1-2-nyan-cat-free-download-png.png"
									:style="{
										position: 'absolute',
										top: `-10px`,
										left: `${seekerbarPercentage}%`,
										width: '50px'
									}"
								/>
								<img
									v-if="
										currentSong &&
										(currentSong.mediaSource ===
											'youtube:DtVBCG6ThDk' ||
											currentSong.mediaSource ===
												'youtube:sI66hcu9fIs' ||
											currentSong.mediaSource ===
												'youtube:iYYRH4apXDo' ||
											currentSong.mediaSource ===
												'youtube:tRcPA7Fzebw')
									"
									src="/assets/rocket.svg"
									:style="{
										position: 'absolute',
										top: `-21px`,
										left: `calc(${seekerbarPercentage}% - 35px)`,
										width: '50px',
										transform: 'rotate(45deg)'
									}"
								/>
								<img
									v-if="
										currentSong &&
										currentSong.mediaSource ===
											'youtube:jofNR_WkoCE'
									"
									src="/assets/fox.svg"
									:style="{
										position: 'absolute',
										top: `-21px`,
										left: `calc(${seekerbarPercentage}% - 35px)`,
										width: '50px',
										transform: 'scaleX(-1)',
										opacity: 1
									}"
								/>
								<img
									v-if="
										currentSong &&
										(currentSong.mediaSource ===
											'youtube:l9PxOanFjxQ' ||
											currentSong.mediaSource ===
												'youtube:xKVcVSYmesU' ||
											currentSong.mediaSource ===
												'youtube:60ItHLz5WEA' ||
											currentSong.mediaSource ===
												'youtube:e6vkFbtSGm0')
									"
									src="/assets/old_logo.png"
									:style="{
										position: 'absolute',
										top: `-9px`,
										left: `calc(${seekerbarPercentage}% - 22px)`,
										'background-color': 'rgb(96, 199, 169)',
										width: '25px',
										height: '25px',
										'border-radius': '25px'
									}"
								/>
								<img
									v-if="
										configStore.get('christmas') &&
										currentSong &&
										![
											'youtube:QH2-TGUlwu4',
											'youtube:DtVBCG6ThDk',
											'youtube:sI66hcu9fIs',
											'youtube:iYYRH4apXDo',
											'youtube:tRcPA7Fzebw',
											'youtube:jofNR_WkoCE',
											'youtube:l9PxOanFjxQ',
											'youtube:xKVcVSYmesU',
											'youtube:60ItHLz5WEA',
											'youtube:e6vkFbtSGm0'
										].includes(currentSong.mediaSource)
									"
									src="/assets/santa.png"
									:style="{
										position: 'absolute',
										top: `-30px`,
										left: `calc(${seekerbarPercentage}% - 25px)`,
										height: '50px',
										transform: 'scaleX(-1)'
									}"
								/>
							</div>
							<div id="control-bar-container">
								<div id="left-buttons">
									<!-- Debug Box -->
									<button
										v-if="frontendDevMode === 'development'"
										class="button is-primary"
										@click="togglePlayerDebugBox()"
										@dblclick="resetPlayerDebugBox()"
										content="Debug"
										v-tippy
									>
										<i
											class="material-icons icon-with-button"
										>
											bug_report
										</i>
									</button>

									<!-- Local Pause/Resume Button -->
									<button
										class="button is-primary"
										@click="resumeLocalStation()"
										id="local-resume"
										v-if="localPaused || autoPaused"
										content="Unpause Playback"
										v-tippy
									>
										<i class="material-icons">play_arrow</i>
									</button>
									<button
										class="button is-primary"
										@click="pauseLocalStation()"
										id="local-pause"
										v-else
										content="Pause Playback"
										v-tippy
									>
										<i class="material-icons">pause</i>
									</button>

									<!-- Vote to Skip Button -->
									<button
										v-if="!skipVotesLoaded"
										class="button is-primary disabled"
										content="Skip votes have not been loaded yet"
										v-tippy
									>
										<i
											class="material-icons icon-with-button"
											>skip_next</i
										>
									</button>
									<button
										v-else-if="loggedIn"
										:class="[
											'button',
											'is-primary',
											{ voted: currentSong.voted }
										]"
										@click="toggleSkipVote()"
										:content="`${
											currentSong.voted
												? 'Remove vote'
												: 'Vote'
										} to Skip Song`"
										v-tippy
									>
										<i
											class="material-icons icon-with-button"
											>skip_next</i
										>
										{{ currentSong.skipVotes }}
									</button>
									<button
										v-else
										class="button is-primary disabled"
										content="Log in to vote to skip songs"
										v-tippy="{ theme: 'info' }"
									>
										<i
											class="material-icons icon-with-button"
											>skip_next</i
										>
										{{ currentSong.skipVotes }}
									</button>

									<!-- Close player window -->
									<button
										v-if="
											experimentalChangableListenModeEnabled
										"
										class="button is-primary"
										content="Close this player window"
										@click="
											experimentalChangableListenModeChange(
												'participate'
											)
										"
										v-tippy
									>
										<i
											class="material-icons icon-with-button"
											>cancel_presentation</i
										>
									</button>
								</div>
								<div id="duration">
									<p>
										{{ timeElapsed }} /
										{{
											utils.formatTime(
												currentSong.duration
											)
										}}
									</p>
								</div>
								<p id="volume-control" v-if="!isApple">
									<i
										class="material-icons"
										@click="toggleMute()"
										:content="`${
											muted ? 'Unmute' : 'Mute'
										}`"
										v-tippy
										>{{
											muted
												? "volume_mute"
												: volumeSliderValue >= 50
												? "volume_up"
												: "volume_down"
										}}</i
									>
									<input
										v-model="volumeSliderValue"
										type="range"
										min="0"
										max="100"
										class="volume-slider active"
										@change="changeVolume()"
										@input="changeVolume()"
									/>
								</p>
								<div id="right-buttons" v-if="loggedIn">
									<!-- Ratings (Like/Dislike) Buttons -->
									<div
										id="ratings"
										v-if="ratingsLoaded && ownRatingsLoaded"
										:class="{
											liked: currentSong.liked,
											disliked: currentSong.disliked
										}"
									>
										<!-- Like Song Button -->
										<button
											class="button is-success like-song"
											id="like-song"
											@click="toggleLike()"
											content="Like Song"
											v-tippy
										>
											<i
												class="material-icons icon-with-button"
												:class="{
													liked: currentSong.liked
												}"
												>thumb_up_alt</i
											>{{ currentSong.likes }}
										</button>

										<!-- Dislike Song Button -->
										<button
											class="button is-danger dislike-song"
											id="dislike-song"
											@click="toggleDislike()"
											content="Dislike Song"
											v-tippy
										>
											<i
												class="material-icons icon-with-button"
												:class="{
													disliked:
														currentSong.disliked
												}"
												>thumb_down_alt</i
											>{{ currentSong.dislikes }}
										</button>
									</div>
									<div id="ratings" class="disabled" v-else>
										<!-- Like Song Button -->
										<button
											class="button is-success like-song disabled"
											id="like-song"
											content="Ratings have not been loaded yet"
											v-tippy
										>
											<i
												class="material-icons icon-with-button"
												>thumb_up_alt</i
											>
										</button>

										<!-- Dislike Song Button -->
										<button
											class="button is-danger dislike-song disabled"
											id="dislike-song"
											content="Ratings have not been loaded yet"
											v-tippy
										>
											<i
												class="material-icons icon-with-button"
												>thumb_down_alt</i
											>
										</button>
									</div>

									<!-- Add Song To Playlist Button & Dropdown -->
									<add-to-playlist-dropdown
										:song="currentSong"
										placement="top-end"
									>
										<template #button>
											<div
												id="add-song-to-playlist"
												content="Add Song to Playlist"
												v-tippy
											>
												<div class="control has-addons">
													<button
														class="button is-primary"
													>
														<i
															class="material-icons"
														>
															playlist_add
														</i>
													</button>
													<button
														class="button"
														id="dropdown-toggle"
													>
														<i
															class="material-icons"
														>
															{{
																showPlaylistDropdown
																	? "expand_more"
																	: "expand_less"
															}}
														</i>
													</button>
												</div>
											</div>
										</template>
									</add-to-playlist-dropdown>
								</div>
								<div id="right-buttons" v-else>
									<!-- Disabled Ratings (Like/Dislike) Buttons -->
									<div id="ratings" v-if="ratingsLoaded">
										<!-- Disabled Like Song Button -->
										<button
											class="button is-success disabled"
											id="like-song"
											content="Log in to like songs"
											v-tippy="{ theme: 'info' }"
										>
											<i
												class="material-icons icon-with-button"
												>thumb_up_alt</i
											>{{ currentSong.likes }}
										</button>

										<!-- Disabled Dislike Song Button -->
										<button
											class="button is-danger disabled"
											id="dislike-song"
											content="Log in to dislike songs"
											v-tippy="{ theme: 'info' }"
										>
											<i
												class="material-icons icon-with-button"
												>thumb_down_alt</i
											>{{ currentSong.dislikes }}
										</button>
									</div>
									<div id="ratings" v-else>
										<!-- Disabled Like Song Button -->
										<button
											class="button is-success disabled"
											id="like-song"
											content="Ratings have not been loaded yet"
											v-tippy="{ theme: 'info' }"
										>
											<i
												class="material-icons icon-with-button"
												>thumb_up_alt</i
											>
										</button>

										<!-- Disabled Dislike Song Button -->
										<button
											class="button is-danger disabled"
											id="dislike-song"
											content="Ratings have not been loaded yet"
											v-tippy="{ theme: 'info' }"
										>
											<i
												class="material-icons icon-with-button"
												>thumb_down_alt</i
											>
										</button>
									</div>
									<!-- Disabled Add Song To Playlist Button & Dropdown -->
									<div id="add-song-to-playlist">
										<div class="control has-addons">
											<button
												class="button is-primary disabled"
												content="Log in to add songs to playlist"
												v-tippy="{ theme: 'info' }"
											>
												<i class="material-icons"
													>queue</i
												>
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>
						<p
							class="player-container nothing-here-text"
							v-if="noSong"
						>
							No song is currently playing
						</p>
						<div v-if="!noSong" id="current-next-row">
							<div
								id="currently-playing-container"
								class="quadrant"
								:class="{ 'no-currently-playing': noSong }"
							>
								<song-item
									:key="`songItem-currentSong-${currentSong.mediaSource}`"
									:song="currentSong"
									:duration="false"
									:requested-by="true"
									:requested-type="true"
									header="Currently Playing.."
								/>
							</div>
							<div
								v-if="nextSong"
								id="next-up-container"
								class="quadrant"
							>
								<song-item
									:key="`songItem-nextSong-${nextSong.mediaSource}`"
									:song="nextSong"
									:duration="false"
									:requested-by="true"
									:requested-type="true"
									header="Next Up.."
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			<main-footer />
		</div>

		<floating-box
			id="player-debug-box"
			ref="playerDebugBox"
			title="Station Debug"
		>
			<template #body>
				<span><b>No song</b>: {{ noSong }}</span>
				<span><b>Song id</b>: {{ currentSong._id }}</span>
				<span><b>Media source</b>: {{ currentSong.mediaSource }}</span>
				<span
					><b>Media source type</b>: {{ currentSongMediaType }}</span
				>
				<span
					><b>Media source value</b>:
					{{ currentSongMediaValue }}</span
				>
				<span><b>Duration</b>: {{ currentSong.duration }}</span>
				<span
					><b>Skip duration</b>: {{ currentSong.skipDuration }}</span
				>
				<span><b>Loading</b>: {{ loading }}</span>
				<span><b>Can autoplay</b>: {{ canAutoplay }}</span>
				<span
					><b>Youtube player ready</b>: {{ youtubePlayerReady }}</span
				>
				<span
					><b>Attempts to play video</b>:
					{{ attemptsToPlayVideo }}</span
				>
				<span
					><b>Last time requested if can autoplay</b>:
					{{ lastTimeRequestedIfCanAutoplay }}</span
				>
				<span><b>Seeking</b>: {{ seeking }}</span>
				<span><b>Playback rate</b>: {{ playbackRate }}</span>
				<span><b>System difference</b>: {{ systemDifference }}</span>
				<span><b>Time before paused</b>: {{ timeBeforePause }}</span>
				<span><b>Time paused</b>: {{ timePaused }}</span>
				<span><b>Time elapsed</b>: {{ timeElapsed }}</span>
				<span><b>Volume slider value</b>: {{ volumeSliderValue }}</span>
				<span><b>Local paused</b>: {{ localPaused }}</span>
				<span><b>Auto paused</b>: {{ autoPaused }}</span>
				<span><b>Station paused</b>: {{ stationPaused }}</span>
				<span :title="new Date(pausedAt).toString()"
					><b>Paused at</b>: {{ pausedAt }}</span
				>
				<span :title="new Date(startedAt).toString()"
					><b>Started at</b>: {{ startedAt }}</span
				>
				<span
					><b>Requests enabled</b>:
					{{ station.requests.enabled }}</span
				>
				<span
					><b>Requests access</b>: {{ station.requests.access }}</span
				>
				<span><b>Requests limit</b>: {{ station.requests.limit }}</span>
				<span
					><b>Auto requesting playlists</b>:
					{{
						autoRequest.map(playlist => playlist._id).join(", ")
					}}</span
				>
				<span
					><b>Autofill enabled</b>:
					{{ station.autofill.enabled }}</span
				>
				<span><b>Autofill limit</b>: {{ station.autofill.limit }}</span>
				<span><b>Autofill mode</b>: {{ station.autofill.mode }}</span>
				<span><b>Skip votes loaded</b>: {{ skipVotesLoaded }}</span>
				<span
					><b>Skip votes current</b>:
					{{
						currentSong.skipVotesCurrent
							? currentSong.skipVotesCurrent
							: "N/A"
					}}</span
				>
				<span
					><b>Skip votes</b>:
					{{ skipVotesLoaded ? currentSong.skipVotes : "N/A" }}</span
				>
				<span><b>Ratings loaded</b>: {{ ratingsLoaded }}</span>
				<span
					><b>Ratings</b>:
					{{
						ratingsLoaded
							? `${currentSong.likes} / ${currentSong.dislikes}`
							: "N/A"
					}}</span
				>
				<span><b>Own ratings loaded</b>: {{ ownRatingsLoaded }}</span>
				<span
					><b>Own ratings</b>:
					{{
						ownRatingsLoaded
							? `${currentSong.liked} / ${currentSong.disliked}`
							: "N/A"
					}}</span
				>
			</template>
		</floating-box>
		<floating-box
			id="keyboardShortcutsHelper"
			ref="keyboardShortcutsHelper"
			title="Station Keyboard Shortcuts"
		>
			<template #body>
				<div>
					<div
						v-if="
							hasPermission('stations.playback.toggle') ||
							hasPermission('stations.skip')
						"
					>
						<span class="biggest"><b>Admin/owner</b></span>
						<span><b>Ctrl + Space</b> - Pause/resume station</span>
						<span><b>Ctrl + Numpad right</b> - Skip station</span>
					</div>
					<hr
						v-if="
							hasPermission('stations.playback.toggle') ||
							hasPermission('stations.skip')
						"
					/>
					<div>
						<span class="biggest"><b>Volume</b></span>
						<span
							><b>Ctrl + Numpad up/down</b> - Volume up/down
							10%</span
						>
						<span
							><b>Ctrl + Shift + Numpad up/down</b> - Volume
							up/down 10%</span
						>
					</div>
					<hr />
					<div>
						<span class="biggest"><b>Misc</b></span>
						<span><b>Ctrl + D</b> - Toggles debug box</span>
						<span><b>Ctrl + Shift + D</b> - Resets debug box</span>
						<span
							><b>Ctrl + /</b> - Toggles keyboard shortcuts
							box</span
						>
						<span
							><b>Ctrl + Shift + /</b> - Resets keyboard shortcuts
							box</span
						>
					</div>
				</div>
			</template>
		</floating-box>

		<Z404 v-if="!exists"></Z404>
	</div>
</template>

<style lang="less">
#youtubeStationPlayer,
#soundcloudStationPlayer {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
}

#currently-playing-container,
#next-up-container {
	.song-item {
		min-height: 130px;

		.thumbnail {
			min-width: 130px;
			width: 130px;
			height: 130px;
		}

		.song-info {
			margin-left: 130px;
		}
	}
}

#control-bar-container
	#right-buttons
	.tippy-box[data-theme~="dropdown"]
	.nav-dropdown-items {
	padding-bottom: 0 !important;
}
</style>

<style lang="less" scoped>
#page-loader-container {
	height: inherit;

	#page-loader-content {
		height: inherit;
		position: absolute;
		max-width: 100%;
		width: 1800px;
		transform: translateX(-50%);
		left: 50%;
	}

	#page-loader-layout {
		height: inherit;
		width: 100%;
	}
}

#mobile-progress-animation {
	width: 50px;
	animation: rotate 0.8s infinite linear;
	border: 8px solid var(--primary-color);
	border-right-color: transparent;
	border-radius: 50%;
	height: 50px;
	position: absolute;
	top: 50%;
	left: 50%;
	display: none;
}

@keyframes rotate {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.nav,
.button.is-primary {
	background-color: var(--primary-color) !important;
}
.button.is-primary:hover,
.button.is-primary:focus {
	filter: brightness(90%);
}

.night-mode {
	#currently-playing-container,
	#next-up-container,
	#control-bar-container,
	.quadrant:not(#sidebar-container),
	.player-container {
		background-color: var(--dark-grey-3) !important;
	}

	#video-container,
	#control-bar-container,
	.quadrant:not(#sidebar-container),
	.player-container {
		border: 0 !important;
	}

	#seeker-bar-container {
		background-color: var(--dark-grey-3) !important;
	}

	#dropdown-toggle {
		background-color: var(--dark-grey-2) !important;
		border: 0;

		i {
			color: var(--white);
		}
	}
}

#station-outer-container {
	margin: 0 auto;
	padding: 20px 40px;
	min-height: calc(100vh - 64px);
	width: 100%;
	max-width: 1800px;
	display: flex;

	#station-inner-container {
		width: 100%;
		min-height: calc(100vh - 428px);
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;

		.row {
			display: flex;
			flex-direction: row;
			max-width: 100%;
		}

		.column {
			display: flex;
			flex-direction: column;
		}

		.quadrant {
			border-radius: @border-radius;
			margin: 10px;
			overflow: hidden;
		}

		.quadrant:not(#sidebar-container) {
			background-color: var(--white);
			border: 1px solid var(--light-grey-3);
		}

		#station-left-column,
		#station-right-column {
			padding: 0;
		}

		#current-next-row {
			display: flex;
			flex-direction: row;

			#currently-playing-container,
			#next-up-container {
				overflow: hidden;
				flex-basis: 50%;
				.song-item {
					border: unset;
				}
				.nothing-here-text {
					height: 100%;
				}
			}

			> div:only-child {
				flex: 1 !important;
				flex-basis: 100% !important;
			}
		}

		.player-container {
			height: inherit;
			background-color: var(--white);
			display: flex;
			flex-direction: column;
			border: 1px solid var(--light-grey-3);
			border-radius: @border-radius;
			overflow: hidden;

			&.nothing-here-text {
				margin: 10px;
				flex: 1;
				min-height: 487px;
			}

			#video-container {
				position: relative;
				padding-bottom: 56.25%; /* proportion value to aspect ratio 16:9 (9 / 16 = 0.5625 or 56.25%) */
				height: 0;
				overflow: hidden;

				.player-cannot-autoplay {
					position: relative;
					width: 100%;
					height: 100%;
					bottom: calc(100% + 5px);
					background: var(--primary-color);
					display: flex;
					align-items: center;
					justify-content: center;

					p {
						color: var(--white);
						font-size: 26px;
						text-align: center;
					}
				}
			}

			#seeker-bar-container {
				background-color: var(--white);
				position: relative;
				height: 7px;
				display: block;
				width: 100%;

				#seeker-bar {
					background-color: var(--primary-color);
					top: 0;
					left: 0;
					bottom: 0;
					position: absolute;
					width: 100%;
				}

				.seeker-bar-cover {
					position: absolute;
					top: 0;
					right: 0;
					bottom: 0;
					background-color: inherit;
				}
			}

			#control-bar-container {
				display: flex;
				justify-content: space-around;
				padding: 10px 0;
				width: 100%;
				background: var(--white);
				flex-direction: column;
				flex-flow: wrap;

				.button:not(#dropdown-toggle) {
					width: 75px;
				}

				#left-buttons,
				#right-buttons {
					margin: 3px;
				}

				#left-buttons {
					display: flex;

					.button:not(:first-of-type) {
						margin-left: 5px;
					}

					.disabled {
						filter: grayscale(0.4);
					}
				}

				#duration {
					margin: 3px;
					display: flex;
					align-items: center;

					p {
						font-size: 22px;
						/** prevents duration width slightly varying and shifting other controls slightly */
						width: 150px;
						text-align: center;
					}
				}

				#volume-control {
					margin: 3px;
					margin-top: 0;
					display: flex;
					align-items: center;
					cursor: pointer;

					.volume-slider {
						width: 100%;
						padding: 0 15px;
						background: transparent;
						min-width: 100px;
					}

					input[type="range"] {
						-webkit-appearance: none;
						margin: 7.3px 0;
					}

					input[type="range"]:focus {
						outline: none;
					}

					input[type="range"]::-webkit-slider-runnable-track {
						width: 100%;
						height: 5.2px;
						cursor: pointer;
						box-shadow: 0;
						background: var(--light-grey-3);
						border-radius: @border-radius;
						border: 0;
					}

					input[type="range"]::-webkit-slider-thumb {
						box-shadow: 0;
						border: 0;
						height: 19px;
						width: 19px;
						border-radius: 100%;
						background: var(--primary-color);
						cursor: pointer;
						-webkit-appearance: none;
						margin-top: -6.5px;
					}

					input[type="range"]::-moz-range-track {
						width: 100%;
						height: 5.2px;
						cursor: pointer;
						box-shadow: 0;
						background: var(--light-grey-3);
						border-radius: @border-radius;
						border: 0;
					}

					input[type="range"]::-moz-range-thumb {
						box-shadow: 0;
						border: 0;
						height: 19px;
						width: 19px;
						border-radius: 100%;
						background: var(--primary-color);
						cursor: pointer;
						-webkit-appearance: none;
						margin-top: -6.5px;
					}
					input[type="range"]::-ms-track {
						width: 100%;
						height: 5.2px;
						cursor: pointer;
						box-shadow: 0;
						background: var(--light-grey-3);
						border-radius: @border-radius;
					}

					input[type="range"]::-ms-fill-lower {
						background: var(--light-grey-3);
						border: 0;
						border-radius: 0;
						box-shadow: 0;
					}

					input[type="range"]::-ms-fill-upper {
						background: var(--light-grey-3);
						border: 0;
						border-radius: 0;
						box-shadow: 0;
					}

					input[type="range"]::-ms-thumb {
						box-shadow: 0;
						border: 0;
						height: 15px;
						width: 15px;
						border-radius: 100%;
						background: var(--primary-color);
						cursor: pointer;
						-webkit-appearance: none;
						margin-top: 1.5px;
					}
				}

				#right-buttons {
					display: flex;

					#dropdown-toggle {
						width: 35px;
					}

					#dislike-song,
					#add-song-to-playlist .button:not(#dropdown-toggle) {
						margin-left: 5px;
					}

					#ratings {
						display: flex;

						&.liked #dislike-song,
						&.disliked #like-song {
							background-color: var(--grey) !important;
						}
						#like-song.disabled,
						#dislike-song.disabled {
							filter: grayscale(0.4);
						}
					}

					#add-song-to-playlist {
						display: flex;
						flex-direction: column-reverse;

						#nav-dropdown {
							position: absolute;
							margin-left: 4px;
							margin-bottom: 36px;

							.nav-dropdown-items {
								position: relative;
								right: calc(100% - 110px);
							}
						}

						.control {
							width: fit-content;
							margin-bottom: 0 !important;
							button.disabled {
								filter: grayscale(0.4);
								border-radius: @border-radius;
								&::after {
									margin-right: 100%;
								}
							}
						}
					}
				}
			}
		}

		#sidebar-container {
			border-top: 0;
			position: relative;
			height: inherit;
			flex-grow: 1;
			min-height: 350px;
		}
	}
}

.footer {
	margin-top: 30px;
}

.nyan {
	background: linear-gradient(
		90deg,
		magenta 0%,
		red 15%,
		orange 30%,
		yellow 45%,
		lime 60%,
		cyan 75%,
		blue 90%,
		magenta 100%
	);

	background-size: 200%;
	animation: nyanMoving 4s linear infinite;
}

@keyframes nyanMoving {
	0% {
		background-position: 0% 0%;
	}
	100% {
		background-position: -200% 0%;
	}
}

.christmas-seeker {
	background: repeating-linear-gradient(
		-45deg,
		var(--white) 0 1rem,
		var(--dark-red) 1rem 2rem
	);

	background-size: 200% 100%;
	animation: christmas 20s linear infinite;
}

@keyframes christmas {
	100% {
		background-position: 80% 100%;
	}
}

.bg-bubbles {
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	position: absolute;
	z-index: -1;
	margin: 0px;
	pointer-events: none;
}

.bg-bubbles li {
	position: absolute;
	list-style: none;
	display: block;
	width: 40px;
	height: 40px;
	border-radius: 100px;
	background-color: var(--primary-color);
	opacity: 0.15;
	bottom: 0px;
	-webkit-animation: square 25s infinite;
	animation: square 25s infinite;
	-webkit-transition-timing-function: linear;
	transition-timing-function: linear;
}

.bg-bubbles li:nth-child(1) {
	left: 10%;
}

.bg-bubbles li:nth-child(2) {
	left: 20%;
	width: 80px;
	height: 80px;
	-webkit-animation-delay: 2s;
	animation-delay: 2s;
	-webkit-animation-duration: 17s;
	animation-duration: 17s;
}

.bg-bubbles li:nth-child(3) {
	left: 25%;
	-webkit-animation-delay: 4s;
	animation-delay: 4s;
}

.bg-bubbles li:nth-child(4) {
	left: 40%;
	width: 60px;
	height: 60px;
	-webkit-animation-duration: 22s;
	animation-duration: 22s;
	background-color: var(--primary-color);
	opacity: 0.25;
}

.bg-bubbles li:nth-child(5) {
	left: 70%;
}

.bg-bubbles li:nth-child(6) {
	left: 80%;
	width: 120px;
	height: 120px;
	-webkit-animation-delay: 3s;
	animation-delay: 3s;
	background-color: var(--primary-color);
	opacity: 0.2;
}

.bg-bubbles li:nth-child(7) {
	left: 32%;
	width: 160px;
	height: 160px;
	-webkit-animation-delay: 7s;
	animation-delay: 7s;
}

.bg-bubbles li:nth-child(8) {
	left: 55%;
	width: 20px;
	height: 20px;
	-webkit-animation-delay: 15s;
	animation-delay: 15s;
	-webkit-animation-duration: 40s;
	animation-duration: 40s;
}

.bg-bubbles li:nth-child(9) {
	left: 25%;
	width: 10px;
	height: 10px;
	-webkit-animation-delay: 2s;
	animation-delay: 2s;
	-webkit-animation-duration: 40s;
	animation-duration: 40s;
	background-color: var(--primary-color);
	opacity: 0.3;
}

.bg-bubbles li:nth-child(10) {
	left: 80%;
	width: 160px;
	height: 160px;
	-webkit-animation-delay: 11s;
	animation-delay: 11s;
}

.experimental-listen-mode-container {
	display: flex;
	flex-direction: column;
	justify-content: center;
	row-gap: 16px;
	padding: 16px 16px;

	.row {
		display: flex;
		flex-direction: row;
		column-gap: 16px;

		.ratings {
			flex: 2;
			display: flex;
			flex-direction: row;
			column-gap: 16px;

			button {
				flex: 1;
			}
		}

		.addToPlaylistDropdown {
			flex: 1;

			.button.is-primary {
				flex: 1;
			}
		}
	}
}

/* Tablet view fix */
@media (max-width: 768px) {
	.bg-bubbles li:nth-child(10) {
		display: none;
	}

	.experimental-listen-mode-container {
		row-gap: 8px;

		.row {
			column-gap: 8px;

			.ratings {
				column-gap: 8px;
			}
		}
	}
}

@-webkit-keyframes square {
	0% {
		-webkit-transform: translateY(0);
		transform: translateY(0);
	}
	100% {
		-webkit-transform: translateY(-700px) rotate(600deg);
		transform: translateY(-700px) rotate(600deg);
	}
}

@keyframes square {
	0% {
		-webkit-transform: translateY(0);
		transform: translateY(0);
	}
	100% {
		-webkit-transform: translateY(-700px) rotate(600deg);
		transform: translateY(-700px) rotate(600deg);
	}
}

:deep(.nothing-here-text) {
	display: flex;
	align-items: center;
	justify-content: center;
}

@media (min-width: 1500px) {
	#station-left-column {
		max-width: 650px;
	}
	#station-right-column {
		max-width: calc(100% - 650px);
	}
}

@media (max-width: 1700px) {
	#current-next-row {
		flex-direction: column !important;

		> div {
			flex: 1 !important;
		}
	}
}

@media (max-width: 1500px) {
	#mobile-progress-animation {
		display: block;
	}

	#page-loader-container {
		display: none;
	}

	#station-outer-container {
		max-width: 1500px;

		#station-inner-container {
			flex-direction: row;

			#station-left-column {
				#about-station-container #admin-buttons {
					flex-wrap: wrap;
				}

				#sidebar-container {
					min-height: 350px;
				}
			}

			#station-right-column {
				overflow: hidden;

				#current-next-row {
					flex-direction: column;
				}

				#control-bar-container {
					#duration,
					#volume-control,
					#right-buttons,
					#left-buttons {
						margin-bottom: 5px;
						justify-content: center;
					}

					#duration {
						order: 1;
					}

					#volume-control {
						order: 2;
						max-width: 400px;
					}

					#right-buttons {
						order: 3;
						flex-wrap: wrap;

						#ratings {
							flex-wrap: wrap;
						}
					}

					#left-buttons {
						order: 4;
						flex-wrap: wrap;
					}
				}
			}
		}
	}
}

@media (max-width: 1200px) {
	#station-outer-container {
		max-width: 900px;
		padding: 0;

		#station-inner-container {
			flex-direction: column-reverse;
			flex-wrap: nowrap;
		}
	}
}

@media (max-width: 990px) {
	#station-outer-container {
		min-height: calc(
			100vh - 256px
		); // Height of nav (64px) + height of footer (190px)
	}
}
</style>
