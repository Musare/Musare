<script setup lang="ts">
import { storeToRefs } from "pinia";
import {
	defineAsyncComponent,
	ref,
	computed,
	watch,
	onMounted,
	onBeforeUnmount
} from "vue";
import Toast from "toasters";
import aw from "@/aw";
import validation from "@/validation";
import keyboardShortcuts from "@/keyboardShortcuts";
import { useForm } from "@/composables/useForm";
import { useSoundcloudPlayer } from "@/composables/useSoundcloudPlayer";

import { Song } from "@/types/song.js";

import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { useEditSongStore } from "@/stores/editSong";
import { useStationStore } from "@/stores/station";
import { useUserAuthStore } from "@/stores/userAuth";

import Modal from "@/components/Modal.vue";

const TAG = "[EDITSONG]";

const FloatingBox = defineAsyncComponent(
	() => import("@/components/FloatingBox.vue")
);
const SaveButton = defineAsyncComponent(
	() => import("@/components/SaveButton.vue")
);
const AutoSuggest = defineAsyncComponent(
	() => import("@/components/AutoSuggest.vue")
);
const SongItem = defineAsyncComponent(
	() => import("@/components/SongItem.vue")
);
const Discogs = defineAsyncComponent(() => import("./Tabs/Discogs.vue"));
const ReportsTab = defineAsyncComponent(() => import("./Tabs/Reports.vue"));
const Youtube = defineAsyncComponent(() => import("./Tabs/Youtube.vue"));
const MusareSongs = defineAsyncComponent(() => import("./Tabs/Songs.vue"));
const SongThumbnail = defineAsyncComponent(
	() => import("@/components/SongThumbnail.vue")
);

const props = defineProps({
	modalUuid: { type: String, required: true },
	modalModulePath: {
		type: String,
		default: "modals/editSong/MODAL_UUID"
	},
	discogsAlbum: { type: Object, default: null },
	song: { type: Object, default: null },
	songs: { type: Array, default: null }
});

const editSongStore = useEditSongStore({ modalUuid: props.modalUuid });
const stationStore = useStationStore();
const { socket } = useWebsocketsStore();
const userAuthStore = useUserAuthStore();

const {
	soundcloudIframeElement,
	soundcloudLoadTrack,
	soundcloudSeekTo,
	soundcloudPlay,
	soundcloudPause,
	soundcloudSetVolume,
	soundcloudGetPosition,
	soundcloudGetDuration,
	soundcloudGetCurrentSound,
	soundcloudGetTrackId,
	soundcloudBindListener,
	soundcloudOnTrackStateChange,
	soundcloudUnload
} = useSoundcloudPlayer();

const { openModal, closeCurrentModal, preventCloseCbs } = useModalsStore();
const { hasPermission } = userAuthStore;

const {
	tab,
	video,
	song,
	mediaSource,
	prefillData,
	reports,
	newSong,
	bulk,
	mediaSources,
	songPrefillData
} = storeToRefs(editSongStore);

const songDataLoaded = ref(false);
const songDeleted = ref(false);
const youtubeError = ref(false);
const youtubeErrorMessage = ref("");
const youtubeVideoDuration = ref("0.000");
const youtubeVideoCurrentTime = ref<number | string>(0);
const youtubeVideoNote = ref("");
const useHTTPS = ref(false);
const muted = ref(false);
const volumeSliderValue = ref(0);
const activityWatchMediaDataInterval = ref(null);
const activityWatchMediaLastStatus = ref("");
const activityWatchMediaLastStartDuration = ref(0);
const recommendedGenres = ref([
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
]);
const autosuggest = ref({
	allItems: {
		artists: [],
		genres: [],
		tags: []
	}
});
const songNotFound = ref(false);
const showRateDropdown = ref(false);
const thumbnailElement = ref();
const thumbnailNotSquare = ref(false);
const thumbnailWidth = ref(null);
const thumbnailHeight = ref(null);
const thumbnailLoadError = ref(false);
const tabs = ref([]);
const youtubePlayerReady = ref(true);
const interval = ref();
const saveButtonRefs = ref([]);
const canvasElement = ref();
const genreHelper = ref();
const saveButtonRefName = ref();
// EditSongs
const items = ref([]);
const currentSong = ref<Song>({});
const flagFilter = ref(false);
const sidebarMobileActive = ref(false);
const songItems = ref([]);

const editingItemIndex = computed(() =>
	items.value.findIndex(
		item => item.song.mediaSource === currentSong.value.mediaSource
	)
);
const filteredItems = computed({
	get: () =>
		items.value.filter(item => (flagFilter.value ? item.flagged : true)),
	set: (newItem: any) => {
		const index = items.value.findIndex(
			item => item.song.mediaSource === newItem.mediaSource
		);
		items.value[index] = newItem;
	}
});
const filteredEditingItemIndex = computed(() =>
	filteredItems.value.findIndex(
		item => item.song.mediaSource === currentSong.value.mediaSource
	)
);
const currentSongFlagged = computed(
	() =>
		items.value.find(
			item => item.song.mediaSource === currentSong.value.mediaSource
		)?.flagged
);
// EditSongs end

const {
	editSong,
	stopVideo,
	loadVideoById,
	pauseVideo,
	setSong,
	resetSong,
	updateReports,
	setPlaybackRate
} = editSongStore;

const { updateMediaModalPlayingAudio } = stationStore;

const unloadSong = (_mediaSource, songId?) => {
	songDataLoaded.value = false;
	songDeleted.value = false;
	pauseVideo(true);
	playerHardStop();

	resetSong(_mediaSource);
	thumbnailNotSquare.value = false;
	thumbnailWidth.value = null;
	thumbnailHeight.value = null;
	youtubeVideoCurrentTime.value = "0.000";
	youtubeVideoDuration.value = "0.000";
	youtubeVideoNote.value = "";
	if (songId) socket.dispatch("apis.leaveRoom", `edit-song.${songId}`);
	if (saveButtonRefs.value.saveButton)
		saveButtonRefs.value.saveButton.status = "default";
};

const loadSong = (_mediaSource: string, reset?: boolean) => {
	songNotFound.value = false;
	socket.dispatch(`songs.getSongsFromMediaSources`, [_mediaSource], res => {
		const { songs } = res.data;
		if (res.status === "success" && songs.length > 0) {
			let _song = songs[0];
			_song = Object.assign(_song, prefillData.value);

			setSong(_song, reset);

			// Reset the youtube data one more time so it can properly reset
			youtubeVideoCurrentTime.value = "0.000";
			youtubeVideoDuration.value = "0.000";
			youtubeVideoNote.value = "";

			songDataLoaded.value = true;

			if (_song._id) {
				socket.dispatch("apis.joinRoom", `edit-song.${_song._id}`);
				socket.dispatch("reports.getReportsForSong", _song._id, res => {
					updateReports(res.data.reports);
				});
				newSong.value = false;
			}
		} else {
			new Toast("Song with that ID not found");
			if (bulk.value) songNotFound.value = true;
			if (!bulk.value) closeCurrentModal();
		}
	});
};

const onSavedSuccess = mediaSource => {
	const itemIndex = items.value.findIndex(
		item => item.song.mediaSource === mediaSource
	);
	if (itemIndex > -1) {
		items.value[itemIndex].status = "done";
		items.value[itemIndex].flagged = false;
	}
};

const onSavedError = mediaSource => {
	const itemIndex = items.value.findIndex(
		item => item.song.mediaSource === mediaSource
	);
	if (itemIndex > -1) items.value[itemIndex].status = "error";
};

const onSaving = mediaSource => {
	const itemIndex = items.value.findIndex(
		item => item.song.mediaSource === mediaSource
	);
	if (itemIndex > -1) items.value[itemIndex].status = "saving";
};

const { inputs, unsavedChanges, save, setValue, setOriginalValue } = useForm(
	{
		title: {
			value: "",
			validate: value => {
				if (!validation.isLength(value, 1, 100))
					return "Title must have between 1 and 100 characters.";
				return true;
			}
		},
		duration: {
			value: 0,
			validate: value => {
				// If the original duration is the same as the current value, just accept the validation
				if (inputs.value.duration.originalValue === value) return true;

				// Sum of the specified duration and skipDuration
				const totalDuration =
					Number(inputs.value.skipDuration.value) + Number(value);
				// Duration of the video itself
				const videoDuration = Number.parseFloat(
					youtubeVideoDuration.value
				);

				// If the total duration specified is bigger than the video duration
				if (totalDuration > videoDuration)
					if ((!newSong.value || bulk.value) && !youtubeError.value)
						// If there is no youtube error and this is in bulk mode or not a new song, throw an error
						return "Duration can't be higher than the length of the video";

				// In all other cases, pass validation
				return true;
			}
		},
		skipDuration: 0,
		thumbnail: {
			value: "",
			validate: value => {
				if (!validation.isLength(value, 8, 256))
					return "Thumbnail must have between 8 and 256 characters.";
				if (useHTTPS.value && value.indexOf("https://") !== 0)
					return 'Thumbnail must start with "https://".';
				if (
					!useHTTPS.value &&
					value.indexOf("https://") !== 0 &&
					value.indexOf("http://") !== 0
				)
					return 'Thumbnail must start with "http(s)://".';
				return true;
			}
		},
		mediaSource: {
			value: "",
			validate: value => {
				if (currentSongMediaType.value === "none")
					return "Media source type is not valid.";
				if (!currentSongMediaValue.value)
					return "Media source value is not valid.";

				if (
					currentSongMediaType.value === "youtube" &&
					!newSong.value &&
					youtubeError.value &&
					inputs.value.mediaSource.originalValue !== value
				)
					return "You're not allowed to change the media source while the player is not working";
				return true;
			}
		},
		verified: false,
		addArtist: {
			value: "",
			ignoreUnsaved: true,
			required: false
		},
		artists: {
			value: [],
			validate: value => {
				if (
					(inputs.value.verified.value && value.length < 1) ||
					value.length > 10
				)
					return "Invalid artists. You must have at least 1 artist and a maximum of 10 artists.";

				let error;
				value.forEach(artist => {
					if (!validation.isLength(artist, 1, 64))
						error = "Artist must have between 1 and 64 characters.";
					if (artist === "NONE")
						error =
							'Invalid artist format. Artists are not allowed to be named "NONE".';
				});
				return error || true;
			}
		},
		addGenre: {
			value: "",
			ignoreUnsaved: true,
			required: false
		},
		genres: {
			value: [],
			validate: value => {
				if (
					(inputs.value.verified.value && value.length < 1) ||
					value.length > 16
				)
					return "Invalid genres. You must have between 1 and 16 genres.";

				let error;
				value.forEach(genre => {
					if (!validation.isLength(genre, 1, 32))
						error = "Genre must have between 1 and 32 characters.";
					if (!validation.regex.ascii.test(genre))
						error =
							"Invalid genre format. Only ascii characters are allowed.";
				});
				return error || true;
			}
		},
		addTag: {
			value: "",
			ignoreUnsaved: true,
			required: false
		},
		tags: {
			value: [],
			validate: value => {
				let error;
				value.forEach(tag => {
					if (
						!/^[a-zA-Z0-9_]{1,64}$|^[a-zA-Z0-9_]{1,64}\[[a-zA-Z0-9_]{1,64}\]$/.test(
							tag
						)
					)
						error = "Invalid tag format.";
				});
				return error || true;
			}
		},
		discogs: {
			value: {},
			required: false
		}
	},
	({ status, messages, values }, resolve, reject) => {
		const saveButtonRef = saveButtonRefs.value[saveButtonRefName.value];
		if (status === "success" || (status === "unchanged" && newSong.value)) {
			const mergedValues = Object.assign(song.value, values);
			const cb = res => {
				if (res.status === "error") {
					reject(new Error(res.message));
					return;
				}
				new Toast(res.message);
				saveButtonRef.handleSuccessfulSave();
				onSavedSuccess(values.mediaSource);
				if (newSong.value) loadSong(values.mediaSource, true);
				else setSong(mergedValues);
				resolve();
			};
			if (newSong.value)
				socket.dispatch("songs.create", mergedValues, cb);
			else
				socket.dispatch(
					"songs.update",
					song.value._id,
					mergedValues,
					cb
				);
		} else {
			if (status === "unchanged") {
				new Toast(messages.unchanged);
				saveButtonRef.handleSuccessfulSave();
				onSavedSuccess(values.mediaSource);
			} else {
				Object.values(messages).forEach(message => {
					new Toast({ content: message, timeout: 8000 });
				});
				saveButtonRef.handleFailedSave();
				onSavedError(values.mediaSource);
			}
			resolve();
		}
	},
	{ modalUuid: props.modalUuid, preventCloseUnsaved: false }
);

const currentSongMediaType = computed(() => {
	if (
		!inputs.value.mediaSource.value ||
		inputs.value.mediaSource.value.indexOf(":") === -1
	)
		return "none";
	return inputs.value.mediaSource.value.split(":")[0];
});
const currentSongMediaValue = computed(() => {
	if (
		!inputs.value.mediaSource.value ||
		inputs.value.mediaSource.value.indexOf(":") === -1
	)
		return null;
	return inputs.value.mediaSource.value.split(":")[1];
});
const getCurrentPlayerTime = () =>
	new Promise<number>((resolve, reject) => {
		if (
			currentSongMediaType.value === "youtube" &&
			youtubePlayerReady.value
		) {
			resolve(
				video.value.player && video.value.player.getCurrentTime
					? video.value.player.getCurrentTime()
					: 0
			);
			return;
		}

		if (currentSongMediaType.value === "soundcloud") {
			soundcloudGetPosition(position => {
				resolve(position / 1000);
			});
			return;
		}

		resolve(0);
	});

const getPlayerDuration = () =>
	new Promise<number>((resolve, reject) => {
		if (
			currentSongMediaType.value === "youtube" &&
			youtubePlayerReady.value
		) {
			resolve(
				video.value.player && video.value.player.getDuration
					? video.value.player.getDuration()
					: 0
			);
			return;
		}

		if (currentSongMediaType.value === "soundcloud") {
			soundcloudGetDuration(duration => {
				resolve(duration / 1000);
			});
			return;
		}

		resolve(0);
	});

const showTab = payload => {
	if (tabs.value[`${payload}-tab`])
		tabs.value[`${payload}-tab`].scrollIntoView({ block: "nearest" });
	editSongStore.showTab(payload);
};

const toggleDone = (index, overwrite = null) => {
	const { status } = filteredItems.value[index];

	if (status === "done" && overwrite !== "done")
		filteredItems.value[index].status = "todo";
	else {
		filteredItems.value[index].status = "done";
		filteredItems.value[index].flagged = false;
	}
};

const toggleFlagFilter = () => {
	flagFilter.value = !flagFilter.value;
};

const toggleMobileSidebar = () => {
	sidebarMobileActive.value = !sidebarMobileActive.value;
};

const onCloseOrNext = (next?: boolean): Promise<void> =>
	new Promise(resolve => {
		const confirmReasons = [];

		if (unsavedChanges.value.length > 0) {
			confirmReasons.push(
				"You have unsaved changes. Are you sure you want to discard unsaved changes?"
			);
		}

		if (!next && bulk.value) {
			const doneItems = items.value.filter(
				item => item.status === "done"
			).length;
			const flaggedItems = items.value.filter(
				item => item.flagged
			).length;
			const notDoneItems = items.value.length - doneItems;

			if (doneItems > 0 && notDoneItems > 0)
				confirmReasons.push(
					"You have songs which are not done yet. Are you sure you want to stop editing songs?"
				);
			else if (flaggedItems > 0)
				confirmReasons.push(
					"You have songs which are flagged. Are you sure you want to stop editing songs?"
				);
		}

		if (confirmReasons.length > 0)
			openModal({
				modal: "confirm",
				props: {
					message: confirmReasons,
					onCompleted: resolve
				}
			});
		else resolve();
	});

const pickSong = song => {
	onCloseOrNext(true).then(() => {
		editSong({
			mediaSource: song.mediaSource,
			prefill: songPrefillData.value[song.mediaSource]
		});
		currentSong.value = song;
		if (songItems.value[`edit-songs-item-${song.mediaSource}`])
			songItems.value[
				`edit-songs-item-${song.mediaSource}`
			].scrollIntoView();
	});
};

const editNextSong = () => {
	const currentlyEditingSongIndex = filteredEditingItemIndex.value;
	let newEditingSongIndex = -1;
	const index =
		currentlyEditingSongIndex + 1 === filteredItems.value.length
			? 0
			: currentlyEditingSongIndex + 1;
	for (let i = index; i < filteredItems.value.length; i += 1) {
		if (!flagFilter.value || filteredItems.value[i].flagged) {
			newEditingSongIndex = i;
			break;
		}
	}

	if (newEditingSongIndex > -1) {
		const nextSong = filteredItems.value[newEditingSongIndex].song;
		if (nextSong.removed) editNextSong();
		else pickSong(nextSong);
	}
};

const saveSong = (refName: string, closeOrNext?: boolean) => {
	saveButtonRefName.value = refName;
	onSaving(inputs.value.mediaSource.value);
	save(() => {
		if (closeOrNext && bulk.value) editNextSong();
		else if (closeOrNext) closeCurrentModal();
	});
};

const toggleFlag = (songIndex = null) => {
	if (songIndex && songIndex > -1) {
		filteredItems.value[songIndex].flagged =
			!filteredItems.value[songIndex].flagged;
		new Toast(
			`Successfully ${
				filteredItems.value[songIndex].flagged ? "flagged" : "unflagged"
			} song.`
		);
	} else if (!songIndex && editingItemIndex.value > -1) {
		items.value[editingItemIndex.value].flagged =
			!items.value[editingItemIndex.value].flagged;
		new Toast(
			`Successfully ${
				items.value[editingItemIndex.value].flagged
					? "flagged"
					: "unflagged"
			} song.`
		);
	}
};

const onThumbnailLoad = () => {
	if (thumbnailElement.value) {
		const height = thumbnailElement.value.naturalHeight;
		const width = thumbnailElement.value.naturalWidth;

		thumbnailNotSquare.value = height !== width;
		thumbnailHeight.value = height;
		thumbnailWidth.value = width;
	} else {
		thumbnailNotSquare.value = false;
		thumbnailHeight.value = null;
		thumbnailWidth.value = null;
	}
};

const onThumbnailLoadError = error => {
	thumbnailLoadError.value = error !== 0;
};

const isYoutubeThumbnail = computed(
	() =>
		songDataLoaded.value &&
		inputs.value.mediaSource.value &&
		inputs.value.mediaSource.value.startsWith("youtube:") &&
		inputs.value.thumbnail.value &&
		(inputs.value.thumbnail.value.lastIndexOf("i.ytimg.com") !== -1 ||
			inputs.value.thumbnail.value.lastIndexOf("img.youtube.com") !== -1)
);

const drawCanvas = async () => {
	if (!songDataLoaded.value || !canvasElement.value) return;
	const ctx = canvasElement.value.getContext("2d");

	const videoDuration = Number(youtubeVideoDuration.value);

	const skipDuration = Number(inputs.value.skipDuration.value);
	const duration = Number(inputs.value.duration.value);
	const afterDuration = videoDuration - (skipDuration + duration);

	const width = 530;

	const currentTime = await getCurrentPlayerTime();

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
	ctx.fillRect(widthSkipDuration + widthDuration, 0, widthAfterDuration, 20);

	ctx.fillStyle = currentDurationColor;
	ctx.fillRect(widthCurrentTime, 0, 1, 20);
};

const seekTo = (position, play = true) => {
	if (currentSongMediaType.value === "youtube") {
		if (play) {
			video.value.player.seekTo(position);
			pauseVideo(false);
			playerPlay();
		}
	}

	if (currentSongMediaType.value === "soundcloud") {
		soundcloudSeekTo(position * 1000);
		if (play) {
			soundcloudPlay();
		}
	}
};

const getAlbumData = type => {
	if (!inputs.value.discogs.value) return;
	if (type === "title")
		setValue({ title: inputs.value.discogs.value.track.title });
	if (type === "albumArt")
		setValue({ thumbnail: inputs.value.discogs.value.album.albumArt });
	if (type === "genres")
		setValue({
			genres: JSON.parse(
				JSON.stringify(inputs.value.discogs.value.album.genres)
			)
		});
	if (type === "artists")
		setValue({
			artists: JSON.parse(
				JSON.stringify(inputs.value.discogs.value.album.artists)
			)
		});
};

const getYouTubeData = type => {
	if (type === "title") {
		try {
			const { title } = video.value.player.getVideoData();

			if (title) setValue({ title });
			else throw new Error("No title found");
		} catch (e) {
			new Toast(
				"Unable to fetch YouTube video title. Try starting the video."
			);
		}
	}
	if (type === "thumbnail")
		setValue({
			thumbnail: `https://img.youtube.com/vi/${
				inputs.value.mediaSource.value.split(":")[1]
			}/mqdefault.jpg`
		});
	if (type === "author") {
		try {
			const { author } = video.value.player.getVideoData();

			if (author) setValue({ addArtist: author });
			else throw new Error("No video author found");
		} catch (e) {
			new Toast(
				"Unable to fetch YouTube video author. Try starting the video."
			);
		}
	}
};

const getSoundCloudData = type => {
	if (type === "title") {
		try {
			soundcloudGetCurrentSound(soundcloudCurrentSound => {
				const { title } = soundcloudCurrentSound;

				if (title) setValue({ title });
				else throw new Error("No title found");
			});
		} catch (e) {
			new Toast("Unable to fetch SoundCloud track title.");
		}
	}

	if (type === "thumbnail") {
		setValue({
			thumbnail: `https://img.youtube.com/vi/${
				inputs.value.mediaSource.value.split(":")[1]
			}/mqdefault.jpg`
		});

		try {
			soundcloudGetCurrentSound(soundcloudCurrentSound => {
				const { artwork_url: artworkUrl } = soundcloudCurrentSound;

				if (artworkUrl) setValue({ thumbnail: artworkUrl });
				else throw new Error("No thumbnail found");
			});
		} catch (e) {
			new Toast("Unable to fetch SoundCloud track artwork.");
		}
	}

	if (type === "author") {
		try {
			soundcloudGetCurrentSound(soundcloudCurrentSound => {
				const { user } = soundcloudCurrentSound;

				if (user) setValue({ addArtist: user.username });
				else throw new Error("No artist found");
			});
		} catch (e) {
			new Toast("Unable to fetch SoundCloud track artist.");
		}
	}
};

const fillDuration = () => {
	if (currentSongMediaType.value === "youtube")
		setValue({
			duration:
				Number.parseFloat(youtubeVideoDuration.value) -
				inputs.value.skipDuration.value
		});
	else if (currentSongMediaType.value === "soundcloud") {
		soundcloudGetDuration(duration => {
			setValue({
				duration:
					Number.parseFloat(duration) / 1000 -
					inputs.value.skipDuration.value
			});
		});
	}
};

const playerHardStop = () => {
	if (
		youtubePlayerReady.value &&
		video.value.player &&
		video.value.player.stopVideo
	)
		video.value.player.stopVideo();
	soundcloudUnload();
};

const playerPause = () => {
	if (
		youtubePlayerReady.value &&
		video.value.player &&
		video.value.player.pauseVideo
	)
		video.value.player.pauseVideo();
	soundcloudPause();
};

const playerPlay = () => {
	if (currentSongMediaType.value === "youtube") {
		soundcloudPause();
		if (
			youtubePlayerReady.value &&
			video.value.player &&
			video.value.player.playVideo
		)
			video.value.player.playVideo();
	} else if (currentSongMediaType.value === "soundcloud") {
		if (
			youtubePlayerReady.value &&
			video.value.player &&
			video.value.player.pauseVideo
		)
			video.value.player.pauseVideo();
		soundcloudPlay();
	}
};

const settings = type => {
	switch (type) {
		case "stop":
			stopVideo();
			playerPause();
			pauseVideo(true);

			break;
		case "hardStop":
			playerHardStop();
			pauseVideo(true);

			break;
		case "pause":
			playerPause();
			pauseVideo(true);

			break;
		case "play":
			playerPlay();
			pauseVideo(false);

			break;
		case "skipToLast10Secs":
			seekTo(
				inputs.value.duration.value -
					10 +
					inputs.value.skipDuration.value
			);
			break;
		default:
			break;
	}
};

const play = () => {
	if (
		currentSongMediaType.value === "youtube" &&
		inputs.value.mediaSource.value !==
			`youtube:${video.value.player.getVideoData().video_id}`
	) {
		setValue({ duration: -1 });
		loadVideoById(
			inputs.value.mediaSource.value.split(":")[1],
			inputs.value.skipDuration.value
		);
	}

	console.log(
		`|${
			inputs.value.mediaSource.value
		}|--|soundcloud:${soundcloudGetTrackId()}|`
	);

	if (
		currentSongMediaType.value === "soundcloud" &&
		`${inputs.value.mediaSource.value}` !==
			`soundcloud:${soundcloudGetTrackId()}`
	) {
		setValue({ duration: -1 });
		console.log(
			"ON PLAY LOAD SC",
			currentSongMediaValue.value,
			Math.max(Number(inputs.value.skipDuration.value), 0),
			true
		);
		soundcloudLoadTrack(
			currentSongMediaValue.value,
			Math.max(Number(inputs.value.skipDuration.value), 0),
			true
		);
	}

	settings("play");
};

const changeSoundcloudPlayerVolume = () => {
	if (muted.value) soundcloudSetVolume(0);
	else soundcloudSetVolume(volumeSliderValue.value);
};

const changePlayerVolume = () => {
	if (youtubePlayerReady.value) {
		video.value.player.setVolume(volumeSliderValue.value);
		if (muted.value) video.value.player.mute();
		else video.value.player.unMute();
	}

	changeSoundcloudPlayerVolume();
};

const changeVolume = () => {
	const volume = volumeSliderValue.value;
	localStorage.setItem("volume", `${volume}`);
	muted.value = volume <= 0;
	localStorage.setItem("muted", `${muted.value}`);

	changePlayerVolume();
};

const toggleMute = () => {
	muted.value = !muted.value;

	changePlayerVolume();
};

const addTag = (type, value?) => {
	if (type === "genres") {
		const genre = value || inputs.value.addGenre.value.trim();

		if (
			inputs.value.genres.value
				.map(genre => genre.toLowerCase())
				.indexOf(genre.toLowerCase()) !== -1
		)
			return new Toast("Genre already exists");
		if (genre) {
			inputs.value.genres.value.push(genre);
			setValue({ addGenre: "" });
			return false;
		}

		return new Toast("Genre cannot be empty");
	}
	if (type === "artists") {
		const artist = value || inputs.value.addArtist.value.trim();
		if (inputs.value.artists.value.indexOf(artist) !== -1)
			return new Toast("Artist already exists");
		if (artist !== "") {
			inputs.value.artists.value.push(artist);
			setValue({ addArtist: "" });
			return false;
		}
		return new Toast("Artist cannot be empty");
	}
	if (type === "tags") {
		const tag = value || inputs.value.addTag.value.trim();
		if (inputs.value.tags.value.indexOf(tag) !== -1)
			return new Toast("Tag already exists");
		if (tag !== "") {
			inputs.value.tags.value.push(tag);
			setValue({ addTag: "" });
			return false;
		}
		return new Toast("Tag cannot be empty");
	}

	return false;
};

const removeTag = (type, value) => {
	if (type === "genres")
		inputs.value.genres.value.splice(
			inputs.value.genres.value.indexOf(value),
			1
		);
	else if (type === "artists")
		inputs.value.artists.value.splice(
			inputs.value.artists.value.indexOf(value),
			1
		);
	else if (type === "tags")
		inputs.value.tags.value.splice(
			inputs.value.tags.value.indexOf(value),
			1
		);
};

const setTrackPosition = async event => {
	const clickPosition =
		(event.pageX - event.target.getBoundingClientRect().left) / 530;

	if (currentSongMediaType.value === "youtube" && youtubePlayerReady.value) {
		seekTo(
			Number(Number(video.value.player.getDuration()) * clickPosition)
		);
	}

	if (currentSongMediaType.value === "soundcloud") {
		const duration = await getPlayerDuration();
		seekTo(Number(Number(duration) * clickPosition));
	}
};

const toggleGenreHelper = () => {
	genreHelper.value.toggleBox();
};

const resetGenreHelper = () => {
	genreHelper.value.resetBox();
};

const sendActivityWatchMediaData = () => {
	// TODO have this support soundcloud
	if (
		!video.value.paused &&
		(currentSongMediaType.value !== "youtube" ||
			video.value.player.getPlayerState() ===
				window.YT.PlayerState.PLAYING)
	) {
		if (activityWatchMediaLastStatus.value !== "playing") {
			activityWatchMediaLastStatus.value = "playing";
			if (
				inputs.value.skipDuration.value > 0 &&
				Number(youtubeVideoCurrentTime.value) === 0
			) {
				activityWatchMediaLastStartDuration.value = Math.floor(
					inputs.value.skipDuration.value +
						Number(youtubeVideoCurrentTime.value)
				);
			} else {
				activityWatchMediaLastStartDuration.value = Math.floor(
					Number(youtubeVideoCurrentTime.value)
				);
			}
		}

		const videoData = {
			title: inputs.value.title.value,
			artists: inputs.value.artists.value
				? inputs.value.artists.value.join(", ")
				: null,
			mediaSource: inputs.value.mediaSource.value,
			muted: muted.value,
			volume: volumeSliderValue.value,
			startedDuration:
				activityWatchMediaLastStartDuration.value <= 0
					? 0
					: activityWatchMediaLastStartDuration.value,
			source: `editSong#${inputs.value.mediaSource.value}`,
			hostname: window.location.hostname,
			playerState: Object.keys(window.YT.PlayerState).find(
				key =>
					window.YT.PlayerState[key] ===
					video.value.player.getPlayerState()
			),
			playbackRate: video.value.playbackRate
		};

		aw.sendMediaData(videoData);
	} else {
		activityWatchMediaLastStatus.value = "not_playing";
	}
};

const remove = id => {
	socket.dispatch("songs.remove", id, res => {
		new Toast(res.message);
	});
};

watch(
	[() => inputs.value.duration.value, () => inputs.value.skipDuration.value],
	() => drawCanvas()
);
watch(mediaSource, (_mediaSource, _oldMediaSource) => {
	if (_oldMediaSource) unloadSong(_oldMediaSource);
	if (_mediaSource) loadSong(_mediaSource, true);
});
watch(
	() => inputs.value.mediaSource.value,
	value => {
		if (
			value.split(":")[0] === "youtube" &&
			video.value.player &&
			video.value.player.cueVideoById
		) {
			soundcloudUnload();
			video.value.player.cueVideoById(
				value.split(":")[1],
				inputs.value.skipDuration.value
			);
		}

		if (value.split(":")[0] === "soundcloud") {
			playerPause();
			console.log(
				"ON WATCH LOAD SC",
				value.split(":")[1],
				Number(inputs.value.skipDuration.value),
				true
			);
			soundcloudLoadTrack(
				value.split(":")[1],
				Number(inputs.value.skipDuration.value),
				true
			);
		}
	}
);
watch(
	() => hasPermission("songs.update"),
	value => {
		if (!value) closeCurrentModal(true);
	}
);

onMounted(async () => {
	editSongStore.init({ song: props.song, songs: props.songs });

	editSongStore.form = {
		inputs,
		unsavedChanges,
		save,
		setValue,
		setOriginalValue
	};
	preventCloseCbs[props.modalUuid] = onCloseOrNext;

	activityWatchMediaDataInterval.value = setInterval(() => {
		sendActivityWatchMediaData();
	}, 1000);

	useHTTPS.value = await lofig.get("cookie.secure");

	socket.onConnect(() => {
		if (newSong.value && !mediaSource.value && !bulk.value) {
			setSong({
				mediaSource: "",
				title: "",
				artists: [],
				genres: [],
				tags: [],
				duration: 0,
				skipDuration: 0,
				thumbnail: "",
				verified: false
			});
			songDataLoaded.value = true;
			showTab("youtube");
		} else if (mediaSource.value) loadSong(mediaSource.value);
		else if (!bulk.value) {
			new Toast("You can't open EditSong without editing a song");
			return closeCurrentModal();
		}

		interval.value = setInterval(async () => {
			const currentPlayerTime = await getCurrentPlayerTime();
			const playerDuration = await getPlayerDuration();

			if (
				inputs.value.duration.value !== -1 &&
				video.value.paused === false
			) {
				if (
					(currentSongMediaType.value === "youtube" &&
						youtubePlayerReady.value) ||
					currentSongMediaType.value === "soundcloud"
				) {
					if (
						currentPlayerTime - inputs.value.skipDuration.value >
							inputs.value.duration.value ||
						(currentPlayerTime > 0 &&
							currentPlayerTime >= playerDuration)
					) {
						pauseVideo(true);
						playerPause();
						seekTo(0, false);

						drawCanvas();
					}
				}
			}

			if (
				currentSongMediaType.value === "youtube" &&
				youtubePlayerReady.value &&
				video.value.player.getVideoData &&
				video.value.player.getVideoData() &&
				`youtube:${video.value.player.getVideoData().video_id}` ===
					inputs.value.mediaSource.value
			) {
				const currentTime = video.value.player.getCurrentTime();

				if (currentTime !== undefined)
					youtubeVideoCurrentTime.value = currentTime.toFixed(3);

				if (youtubeVideoDuration.value.indexOf(".000") !== -1) {
					const duration = video.value.player.getDuration();

					if (duration !== undefined) {
						if (
							`${youtubeVideoDuration.value}` ===
							`${Number(inputs.value.duration.value).toFixed(3)}`
						)
							setValue({ duration: duration.toFixed(3) });

						youtubeVideoDuration.value = duration.toFixed(3);
						if (youtubeVideoDuration.value.indexOf(".000") !== -1)
							youtubeVideoNote.value = "(~)";
						else youtubeVideoNote.value = "";

						drawCanvas();
					}
				}
			}

			if (currentSongMediaType.value === "soundcloud") {
				console.log(
					"INTERVAL SOUNDCLOUD",
					currentPlayerTime,
					playerDuration,
					youtubeVideoCurrentTime.value,
					youtubeVideoDuration.value,
					inputs.value.duration.value
				);

				if (currentPlayerTime)
					youtubeVideoCurrentTime.value =
						Number(currentPlayerTime).toFixed(3);

				if (youtubeVideoDuration.value === "0.000") {
					if (playerDuration) {
						youtubeVideoDuration.value =
							Number(playerDuration).toFixed(3);
						if (youtubeVideoDuration.value.indexOf(".000") !== -1)
							youtubeVideoNote.value = "(~)";
						else youtubeVideoNote.value = "";
					}

					if (
						!inputs.value.duration.value ||
						(Number(inputs.value.duration.value) <= 0 &&
							playerDuration &&
							Number(playerDuration) > 0)
					) {
						setValue({ duration: playerDuration.toFixed(3) });
					}

					drawCanvas();
				}
			}

			if (video.value.paused === false) drawCanvas();
		}, 200);

		if (window.YT && window.YT.Player) {
			video.value.player = new window.YT.Player(
				`editSongPlayerYouTube-${props.modalUuid}`,
				{
					height: 298,
					width: 530,
					videoId: null,
					host: "https://www.youtube-nocookie.com",
					playerVars: {
						controls: 0,
						iv_load_policy: 3,
						rel: 0,
						showinfo: 0,
						autoplay: 0
					},
					startSeconds: inputs.value.skipDuration.value,
					events: {
						onReady: () => {
							changePlayerVolume();

							youtubePlayerReady.value = true;

							if (
								inputs.value.mediaSource.value &&
								inputs.value.mediaSource.value.startsWith(
									"youtube:"
								)
							)
								video.value.player.cueVideoById(
									inputs.value.mediaSource.value.split(
										":"
									)[1],
									inputs.value.skipDuration.value
								);

							setPlaybackRate(null);

							drawCanvas();
						},
						onStateChange: event => {
							drawCanvas();

							if (event.data === 1) {
								video.value.paused = false;
								updateMediaModalPlayingAudio(true);
								let youtubeDuration =
									video.value.player.getDuration();
								const newYoutubeVideoDuration =
									youtubeDuration.toFixed(3);

								if (
									youtubeVideoDuration.value.indexOf(
										".000"
									) !== -1 &&
									`${youtubeVideoDuration.value}` !==
										`${newYoutubeVideoDuration}`
								) {
									const songDurationNumber = Number(
										inputs.value.duration.value
									);
									const songDurationNumber2 =
										Number(inputs.value.duration.value) + 1;
									const songDurationNumber3 =
										Number(inputs.value.duration.value) - 1;
									const fixedSongDuration =
										songDurationNumber.toFixed(3);
									const fixedSongDuration2 =
										songDurationNumber2.toFixed(3);
									const fixedSongDuration3 =
										songDurationNumber3.toFixed(3);

									if (
										`${youtubeVideoDuration.value}` ===
											`${Number(
												inputs.value.duration.value
											).toFixed(3)}` &&
										(fixedSongDuration ===
											youtubeVideoDuration.value ||
											fixedSongDuration2 ===
												youtubeVideoDuration.value ||
											fixedSongDuration3 ===
												youtubeVideoDuration.value)
									)
										setValue({
											duration: newYoutubeVideoDuration
										});

									youtubeVideoDuration.value =
										newYoutubeVideoDuration;
									if (
										youtubeVideoDuration.value.indexOf(
											".000"
										) !== -1
									)
										youtubeVideoNote.value = "(~)";
									else youtubeVideoNote.value = "";
								}

								if (inputs.value.duration.value === -1)
									setValue({
										duration: Number.parseFloat(
											youtubeVideoDuration.value
										)
									});

								youtubeDuration -=
									inputs.value.skipDuration.value;
								if (
									inputs.value.duration.value >
									youtubeDuration + 1
								) {
									pauseVideo(true);
									playerPause();
									seekTo(0, false);

									return new Toast(
										"Video can't play. Specified duration is bigger than the YouTube song duration."
									);
								}
								if (inputs.value.duration.value <= 0) {
									pauseVideo(true);
									playerPause();
									seekTo(0, false);

									return new Toast(
										"Video can't play. Specified duration has to be more than 0 seconds."
									);
								}

								if (
									video.value.player.getCurrentTime() <
									inputs.value.skipDuration.value
								) {
									return seekTo(
										inputs.value.skipDuration.value
									);
								}

								setPlaybackRate(null);
							} else if (event.data === 2) {
								video.value.paused = true;
								updateMediaModalPlayingAudio(false);
							}

							return false;
						}
					}
				}
			);
		} else {
			youtubeError.value = true;
			youtubeErrorMessage.value = "Player could not be loaded.";
		}

		["artists", "genres", "tags"].forEach(type => {
			socket.dispatch(
				`songs.get${type.charAt(0).toUpperCase()}${type.slice(1)}`,
				res => {
					if (res.status === "success") {
						const { items } = res.data;
						if (type === "genres")
							autosuggest.value.allItems[type] = Array.from(
								new Set([...recommendedGenres.value, ...items])
							);
						else autosuggest.value.allItems[type] = items;
					} else {
						new Toast(res.message);
					}
				}
			);
		});

		if (bulk.value) {
			socket.dispatch("apis.joinRoom", "edit-songs");

			console.log(68768, mediaSources.value);

			socket.dispatch(
				"songs.getSongsFromMediaSources",
				mediaSources.value,
				res => {
					if (res.data.songs.length === 0) {
						closeCurrentModal();
						new Toast("You can't edit 0 songs.");
					} else {
						items.value = res.data.songs.map(song => ({
							status: "todo",
							flagged: false,
							song
						}));
						editNextSong();
					}
				}
			);
		}

		return null;
	});

	socket.on(
		`event:admin.song.updated`,
		res => {
			if (song.value._id === res.data.song._id)
				setOriginalValue({
					title: res.data.song.title,
					duration: res.data.song.duration,
					skipDuration: res.data.song.skipDuration,
					thumbnail: res.data.song.thumbnail,
					mediaSource: res.data.song.mediaSource,
					verified: res.data.song.verified,
					artists: res.data.song.artists,
					genres: res.data.song.genres,
					tags: res.data.song.tags,
					discogs: res.data.song.discogs
				});
			if (bulk.value) {
				const index = items.value
					.map(item => item.song.mediaSource)
					.indexOf(res.data.song.mediaSource);
				if (index >= 0)
					items.value[index].song = {
						...items.value[index].song,
						...res.data.song,
						updated: true
					};
			}
		},
		{ modalUuid: props.modalUuid }
	);

	socket.on(
		"event:admin.song.removed",
		res => {
			if (res.data.songId === song.value._id) {
				songDeleted.value = true;
				if (!bulk.value) closeCurrentModal(true);
			}
		},
		{ modalUuid: props.modalUuid }
	);

	if (bulk.value) {
		socket.on(
			`event:admin.song.created`,
			res => {
				const index = items.value
					.map(item => item.song.mediaSource)
					.indexOf(res.data.song.mediaSource);
				if (index >= 0)
					items.value[index].song = {
						...items.value[index].song,
						...res.data.song,
						created: true
					};
			},
			{ modalUuid: props.modalUuid }
		);

		socket.on(
			`event:admin.song.removed`,
			res => {
				const index = items.value
					.map(item => item.song._id)
					.indexOf(res.data.songId);
				if (index >= 0) items.value[index].song.removed = true;
			},
			{ modalUuid: props.modalUuid }
		);

		socket.on(
			`event:admin.youtubeVideo.removed`,
			res => {
				const index = items.value
					.map(item => item.song.youtubeVideoId)
					.indexOf(res.videoId);
				if (index >= 0) items.value[index].song.removed = true;
			},
			{ modalUuid: props.modalUuid }
		);
	}

	let volume = parseFloat(localStorage.getItem("volume"));
	volume = typeof volume === "number" && !Number.isNaN(volume) ? volume : 20;
	localStorage.setItem("volume", `${volume}`);
	volumeSliderValue.value = volume;

	keyboardShortcuts.registerShortcut("editSong.pauseResumeVideo", {
		keyCode: 101,
		preventDefault: true,
		handler: () => {
			if (video.value.paused) play();
			else settings("pause");
		}
	});

	keyboardShortcuts.registerShortcut("editSong.stopVideo", {
		keyCode: 101,
		ctrl: true,
		preventDefault: true,
		handler: () => {
			settings("stop");
		}
	});

	keyboardShortcuts.registerShortcut("editSong.hardStopVideo", {
		keyCode: 101,
		ctrl: true,
		shift: true,
		preventDefault: true,
		handler: () => {
			settings("hardStop");
		}
	});

	keyboardShortcuts.registerShortcut("editSong.skipToLast10Secs", {
		keyCode: 102,
		preventDefault: true,
		handler: () => {
			settings("skipToLast10Secs");
		}
	});

	keyboardShortcuts.registerShortcut("editSong.lowerVolumeLarge", {
		keyCode: 98,
		preventDefault: true,
		handler: () => {
			volumeSliderValue.value = Math.max(0, volumeSliderValue.value - 10);
			changeVolume();
		}
	});

	keyboardShortcuts.registerShortcut("editSong.lowerVolumeSmall", {
		keyCode: 98,
		ctrl: true,
		preventDefault: true,
		handler: () => {
			volumeSliderValue.value = Math.max(0, volumeSliderValue.value - 1);
			changeVolume();
		}
	});

	keyboardShortcuts.registerShortcut("editSong.increaseVolumeLarge", {
		keyCode: 104,
		preventDefault: true,
		handler: () => {
			volumeSliderValue.value = Math.min(
				100,
				volumeSliderValue.value + 10
			);
			changeVolume();
		}
	});

	keyboardShortcuts.registerShortcut("editSong.increaseVolumeSmall", {
		keyCode: 104,
		ctrl: true,
		preventDefault: true,
		handler: () => {
			volumeSliderValue.value = Math.min(
				100,
				volumeSliderValue.value + 1
			);
			changeVolume();
		}
	});

	keyboardShortcuts.registerShortcut("editSong.save", {
		keyCode: 83,
		ctrl: true,
		preventDefault: true,
		handler: () => {
			saveSong("saveButton");
		}
	});

	keyboardShortcuts.registerShortcut("editSong.saveClose", {
		keyCode: 83,
		ctrl: true,
		alt: true,
		preventDefault: true,
		handler: () => {
			saveSong("saveAndCloseButton", true);
		}
	});

	keyboardShortcuts.registerShortcut("editSong.focusTitle", {
		keyCode: 36,
		preventDefault: true,
		handler: () => {
			inputs.value["title-input"].focus();
		}
	});

	keyboardShortcuts.registerShortcut("editSong.useAllDiscogs", {
		keyCode: 68,
		alt: true,
		ctrl: true,
		preventDefault: true,
		handler: () => {
			getAlbumData("title");
			getAlbumData("albumArt");
			getAlbumData("artists");
			getAlbumData("genres");
		}
	});

	/*

	editSong.pauseResume - Num 5 - Pause/resume song
	editSong.stopVideo - Ctrl - Num 5 - Stop
	editSong.hardStopVideo - Shift - Ctrl - Num 5 - Stop
	editSong.skipToLast10Secs - Num 6 - Skip to last 10 seconds

	editSong.lowerVolumeLarge - Num 2 - Volume down by 10
	editSong.lowerVolumeSmall - Ctrl - Num 2 - Volume down by 1
	editSong.increaseVolumeLarge - Num 8 - Volume up by 10
	editSong.increaseVolumeSmall - Ctrl - Num 8 - Volume up by 1

	editSong.focusTitle - Home - Focus the title input
	editSong.focusDicogs - End - Focus the discogs input

	editSong.save - Ctrl - S - Saves song
	editSong.save - Ctrl - Alt - S - Saves song and closes the modal
	editSong.save - Ctrl - Alt - V - Saves song, verifies songs and then closes the modal
	editSong.close - F4 - Closes modal without saving

	editSong.useAllDiscogs - Ctrl - Alt - D - Sets all fields to the Discogs data

	Inside Discogs inputs: Ctrl - D - Sets this field to the Discogs data

	*/

	soundcloudBindListener("seek", () => {
		console.debug(TAG, "Bind on seek");
		// if (seeking.value) seeking.value = false;
	});

	soundcloudBindListener("error", value => {
		console.debug(TAG, "Bind on error", value);
	});
});

onBeforeUnmount(() => {
	if (bulk.value) {
		socket.dispatch("apis.leaveRoom", "edit-songs");
	}

	unloadSong(mediaSource.value, song.value._id);

	updateMediaModalPlayingAudio(false);

	youtubePlayerReady.value = false;
	clearInterval(interval.value);
	clearInterval(activityWatchMediaDataInterval.value);

	const shortcutNames = [
		"editSong.pauseResume",
		"editSong.stopVideo",
		"editSong.hardStopVideo",
		"editSong.skipToLast10Secs",
		"editSong.lowerVolumeLarge",
		"editSong.lowerVolumeSmall",
		"editSong.increaseVolumeLarge",
		"editSong.increaseVolumeSmall",
		"editSong.focusTitle",
		"editSong.focusDicogs",
		"editSong.save",
		"editSong.saveClose",
		"editSong.useAllDiscogs",
		"editSong.closeModal"
	];

	shortcutNames.forEach(shortcutName => {
		keyboardShortcuts.unregisterShortcut(shortcutName);
	});

	delete preventCloseCbs[props.modalUuid];

	// Delete the Pinia store that was created for this modal, after all other cleanup tasks are performed
	editSongStore.$dispose();
});
</script>

<template>
	<div>
		<modal
			:title="`${newSong ? 'Create' : 'Edit'} Song`"
			class="song-modal"
			:size="'wide'"
			:split="true"
		>
			<template #toggleMobileSidebar v-if="bulk">
				<i
					class="material-icons toggle-sidebar-icon"
					:content="`${
						sidebarMobileActive ? 'Close' : 'Open'
					} Edit Queue`"
					v-tippy
					@click="toggleMobileSidebar()"
					>expand_circle_down</i
				>
			</template>
			<template #sidebar v-if="bulk">
				<div class="sidebar" :class="{ active: sidebarMobileActive }">
					<header class="sidebar-head">
						<h2 class="sidebar-title is-marginless">Edit Queue</h2>
						<i
							class="material-icons toggle-sidebar-icon"
							:content="`${
								sidebarMobileActive ? 'Close' : 'Open'
							} Edit Queue`"
							v-tippy
							@click="toggleMobileSidebar()"
							>expand_circle_down</i
						>
					</header>
					<section class="sidebar-body">
						<div
							v-show="filteredItems.length > 0"
							class="edit-songs-items"
						>
							<div
								class="item"
								v-for="(data, index) in filteredItems"
								:key="`edit-songs-item-${index}`"
								:ref="
									el =>
										(songItems[
											`edit-songs-item-${data.song.mediaSource}`
										] = el)
								"
							>
								<song-item
									:song="data.song"
									:thumbnail="false"
									:duration="false"
									:disabled-actions="
										data.song.removed
											? ['all']
											: ['report', 'edit']
									"
									:class="{
										updated: data.song.updated,
										removed: data.song.removed
									}"
								>
									<template #leftIcon>
										<i
											v-if="
												currentSong.mediaSource ===
													data.song.mediaSource &&
												!data.song.removed
											"
											class="material-icons item-icon editing-icon"
											content="Currently editing song"
											v-tippy="{ theme: 'info' }"
											@click="toggleDone(index)"
											>edit</i
										>
										<i
											v-else-if="data.song.removed"
											class="material-icons item-icon removed-icon"
											content="Song removed"
											v-tippy="{ theme: 'info' }"
											>delete_forever</i
										>
										<i
											v-else-if="data.status === 'error'"
											class="material-icons item-icon error-icon"
											content="Error saving song"
											v-tippy="{ theme: 'info' }"
											@click="toggleDone(index)"
											>error</i
										>
										<i
											v-else-if="data.status === 'saving'"
											class="material-icons item-icon saving-icon"
											content="Currently saving song"
											v-tippy="{ theme: 'info' }"
											>pending</i
										>
										<i
											v-else-if="data.flagged"
											class="material-icons item-icon flag-icon"
											content="Song flagged"
											v-tippy="{ theme: 'info' }"
											@click="toggleDone(index)"
											>flag_circle</i
										>
										<i
											v-else-if="data.status === 'done'"
											class="material-icons item-icon done-icon"
											content="Song marked complete"
											v-tippy="{ theme: 'info' }"
											@click="toggleDone(index)"
											>check_circle</i
										>
										<i
											v-else-if="data.status === 'todo'"
											class="material-icons item-icon todo-icon"
											content="Song marked todo"
											v-tippy="{ theme: 'info' }"
											@click="toggleDone(index)"
											>cancel</i
										>
									</template>
									<template
										v-if="!data.song.removed"
										#actions
									>
										<i
											class="material-icons edit-icon"
											content="Edit Song"
											v-tippy
											@click="pickSong(data.song)"
										>
											edit
										</i>
									</template>
									<template #tippyActions>
										<i
											class="material-icons flag-icon"
											:class="{
												flagged: data.flagged
											}"
											content="Toggle Flag"
											v-tippy
											@click="toggleFlag(index)"
										>
											flag_circle
										</i>
									</template>
								</song-item>
							</div>
						</div>
						<p v-if="filteredItems.length === 0" class="no-items">
							{{
								flagFilter
									? "No flagged songs queued"
									: "No songs queued"
							}}
						</p>
					</section>
					<footer class="sidebar-foot">
						<button
							@click="toggleFlagFilter()"
							class="button is-primary"
						>
							{{
								flagFilter
									? "Show All Songs"
									: "Show Only Flagged Songs"
							}}
						</button>
					</footer>
				</div>
				<div
					v-if="sidebarMobileActive"
					class="sidebar-overlay"
					@click="toggleMobileSidebar()"
				></div>
			</template>
			<template #body>
				<div v-if="!mediaSource && !newSong" class="notice-container">
					<h4>No song has been selected</h4>
				</div>
				<div v-if="songDeleted" class="notice-container">
					<h4>The song you were editing has been deleted</h4>
				</div>
				<div
					v-if="
						mediaSource &&
						!songDataLoaded &&
						!songNotFound &&
						!newSong
					"
					class="notice-container"
				>
					<h4>Song hasn't loaded yet</h4>
				</div>
				<div
					v-if="mediaSource && songNotFound && !newSong"
					class="notice-container"
				>
					<h4>Song was not found</h4>
				</div>
				<div
					class="left-section"
					v-show="songDataLoaded && !songDeleted"
				>
					<div class="top-section">
						<div class="player-section">
							<div
								v-show="currentSongMediaType === 'youtube'"
								class="youtube-player-wrapper"
							>
								<div
									:id="`editSongPlayerYouTube-${modalUuid}`"
								></div>
							</div>
							<iframe
								:id="`editSongPlayerSoundCloud-${modalUuid}`"
								v-show="currentSongMediaType === 'soundcloud'"
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
								class="no-media-source-specified-message"
								v-show="
									currentSongMediaType !== 'youtube' &&
									currentSongMediaType !== 'soundcloud'
								"
							>
								<h2>No media source specified</h2>
							</div>

							<div v-show="youtubeError" class="player-error">
								<h2>{{ youtubeErrorMessage }}</h2>
							</div>

							<canvas
								ref="canvasElement"
								class="duration-canvas"
								v-show="!youtubeError"
								height="20"
								width="530"
								@click="setTrackPosition($event)"
							/>
							<div class="player-footer">
								<div class="player-footer-left">
									<button
										class="button is-primary"
										@click="play()"
										@keyup.enter="play()"
										v-if="video.paused"
										content="Resume Playback"
										v-tippy
									>
										<i class="material-icons">play_arrow</i>
									</button>
									<button
										class="button is-primary"
										@click="settings('pause')"
										@keyup.enter="settings('pause')"
										v-else
										content="Pause Playback"
										v-tippy
									>
										<i class="material-icons">pause</i>
									</button>
									<button
										class="button is-danger"
										@click.exact="settings('stop')"
										@click.shift="settings('hardStop')"
										@keyup.enter.exact="settings('stop')"
										@keyup.shift.enter="
											settings('hardStop')
										"
										content="Stop Playback"
										v-tippy
									>
										<i class="material-icons">stop</i>
									</button>
									<tippy
										class="playerRateDropdown"
										:touch="true"
										:interactive="true"
										placement="bottom"
										theme="dropdown"
										ref="dropdown"
										trigger="click"
										append-to="parent"
										@show="
											() => {
												showRateDropdown = true;
											}
										"
										@hide="
											() => {
												showRateDropdown = false;
											}
										"
									>
										<div
											ref="trigger"
											class="control has-addons"
											content="Set Playback Rate"
											v-tippy
										>
											<button class="button is-primary">
												<i class="material-icons"
													>fast_forward</i
												>
											</button>
											<button
												class="button dropdown-toggle"
											>
												<i class="material-icons">
													{{
														showRateDropdown
															? "expand_more"
															: "expand_less"
													}}
												</i>
											</button>
										</div>

										<template #content>
											<div class="nav-dropdown-items">
												<button
													class="nav-item button"
													:class="{
														active:
															video.playbackRate ===
															0.5
													}"
													title="0.5x"
													@click="
														setPlaybackRate(0.5)
													"
												>
													<p>0.5x</p>
												</button>
												<button
													class="nav-item button"
													:class="{
														active:
															video.playbackRate ===
															1
													}"
													title="1x"
													@click="setPlaybackRate(1)"
												>
													<p>1x</p>
												</button>
												<button
													class="nav-item button"
													:class="{
														active:
															video.playbackRate ===
															2
													}"
													title="2x"
													@click="setPlaybackRate(2)"
												>
													<p>2x</p>
												</button>
											</div>
										</template>
									</tippy>
								</div>
								<div class="player-footer-center">
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
									<p id="volume-control">
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
								</div>
							</div>
						</div>
						<song-thumbnail
							v-if="songDataLoaded && !songDeleted"
							:song="{
								mediaSource: inputs['mediaSource'].value,
								thumbnail: inputs['thumbnail'].value
							}"
							:fallback="false"
							class="thumbnail-preview"
							@load-error="onThumbnailLoadError"
						/>
						<img
							v-if="
								!isYoutubeThumbnail &&
								songDataLoaded &&
								!songDeleted
							"
							class="thumbnail-dummy"
							:src="inputs['thumbnail'].value"
							ref="thumbnailElement"
							@load="onThumbnailLoad"
						/>
					</div>

					<div
						class="edit-section"
						v-if="songDataLoaded && !songDeleted"
					>
						<div class="control is-grouped">
							<div class="title-container">
								<label class="label">Title</label>
								<p class="control has-addons">
									<input
										class="input"
										type="text"
										:ref="el => (inputs['title'].ref = el)"
										v-model="inputs['title'].value"
										placeholder="Enter song title..."
										@keyup.shift.enter="
											getAlbumData('title')
										"
									/>
									<button
										v-if="
											currentSongMediaType ===
											'soundcloud'
										"
										class="button soundcloud-get-button"
										@click="getSoundCloudData('title')"
									>
										<div
											class="soundcloud-icon"
											v-tippy
											content="Fill from SoundCloud"
										></div>
									</button>
									<button
										v-if="
											currentSongMediaType ===
												'youtube' && youtubePlayerReady
										"
										class="button youtube-get-button"
										@click="getYouTubeData('title')"
									>
										<div
											class="youtube-icon"
											v-tippy
											content="Fill from YouTube"
										></div>
									</button>
									<button
										v-if="inputs.discogs.value"
										class="button album-get-button"
										@click="getAlbumData('title')"
									>
										<i
											class="material-icons"
											v-tippy
											content="Fill from Discogs"
											>album</i
										>
									</button>
								</p>
							</div>

							<div class="duration-container">
								<label class="label">Duration</label>
								<p class="control has-addons">
									<input
										class="input"
										type="text"
										placeholder="Enter song duration..."
										v-model.number="
											inputs['duration'].value
										"
										@keyup.shift.enter="fillDuration()"
									/>
									<button
										class="button duration-fill-button"
										@click="fillDuration()"
									>
										<i
											class="material-icons"
											v-tippy
											content="Sync duration with player"
											>sync</i
										>
									</button>
								</p>
							</div>

							<div class="skip-duration-container">
								<label class="label">Skip duration</label>
								<p class="control">
									<input
										class="input"
										type="text"
										placeholder="Enter skip duration..."
										v-model.number="
											inputs['skipDuration'].value
										"
									/>
								</p>
							</div>
						</div>

						<div class="control is-grouped">
							<div class="album-art-container">
								<label class="label">
									Thumbnail
									<i
										v-if="
											thumbnailNotSquare &&
											!isYoutubeThumbnail
										"
										class="material-icons thumbnail-warning"
										content="Thumbnail not square, it will be stretched"
										v-tippy="{ theme: 'info' }"
									>
										warning
									</i>
									<i
										v-if="
											thumbnailLoadError &&
											!isYoutubeThumbnail
										"
										class="material-icons thumbnail-warning"
										content="Error loading thumbnail"
										v-tippy="{ theme: 'info' }"
									>
										warning
									</i>
								</label>

								<p class="control has-addons">
									<input
										class="input"
										type="text"
										v-model="inputs['thumbnail'].value"
										placeholder="Enter link to thumbnail..."
										@keyup.shift.enter="
											getAlbumData('albumArt')
										"
									/>
									<button
										v-if="
											currentSongMediaType ===
											'soundcloud'
										"
										class="button soundcloud-get-button"
										@click="getSoundCloudData('thumbnail')"
									>
										<div
											class="soundcloud-icon"
											v-tippy
											content="Fill from SoundCloud"
										></div>
									</button>
									<button
										v-if="
											currentSongMediaType ===
												'youtube' && youtubePlayerReady
										"
										class="button youtube-get-button"
										@click="getYouTubeData('thumbnail')"
									>
										<div
											class="youtube-icon"
											v-tippy
											content="Fill from YouTube"
										></div>
									</button>
									<button
										v-if="inputs.discogs.value"
										class="button album-get-button"
										@click="getAlbumData('albumArt')"
									>
										<i
											class="material-icons"
											v-tippy
											content="Fill from Discogs"
											>album</i
										>
									</button>
								</p>
							</div>
							<div class="youtube-id-container">
								<label class="label">Media source</label>
								<p class="control">
									<input
										class="input"
										type="text"
										placeholder="Enter media source..."
										v-model="inputs['mediaSource'].value"
									/>
								</p>
							</div>
							<div class="verified-container">
								<label class="label">Verified</label>
								<p class="is-expanded checkbox-control">
									<label class="switch">
										<input
											type="checkbox"
											id="verified"
											v-model="inputs['verified'].value"
										/>
										<span class="slider round"></span>
									</label>
								</p>
							</div>
						</div>

						<div class="control is-grouped">
							<div class="artists-container">
								<label class="label">Artists</label>
								<p class="control has-addons">
									<auto-suggest
										v-model="inputs['addArtist'].value"
										ref="new-artist"
										placeholder="Add artist..."
										:all-items="
											autosuggest.allItems.artists
										"
										@submitted="addTag('artists')"
										@keyup.shift.enter="
											getAlbumData('artists')
										"
									/>
									<button
										v-if="
											currentSongMediaType ===
											'soundcloud'
										"
										class="button soundcloud-get-button"
										@click="getSoundCloudData('author')"
									>
										<div
											class="soundcloud-icon"
											v-tippy
											content="Fill from SoundCloud"
										></div>
									</button>
									<button
										v-if="
											currentSongMediaType ===
												'youtube' && youtubePlayerReady
										"
										class="button youtube-get-button"
										@click="getYouTubeData('author')"
									>
										<div
											class="youtube-icon"
											v-tippy
											content="Fill from YouTube"
										></div>
									</button>
									<button
										v-if="inputs.discogs.value"
										class="button album-get-button"
										@click="getAlbumData('artists')"
									>
										<i
											class="material-icons"
											v-tippy
											content="Fill from Discogs"
											>album</i
										>
									</button>
									<button
										class="button is-info add-button"
										@click="addTag('artists')"
									>
										<i class="material-icons">add</i>
									</button>
								</p>
								<div class="list-container">
									<div
										class="list-item"
										v-for="artist in inputs['artists']
											.value"
										:key="artist"
									>
										<div
											class="list-item-circle"
											@click="
												removeTag('artists', artist)
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
										v-tippy
										content="View list of genres"
										>info</i
									>
								</label>
								<p class="control has-addons">
									<auto-suggest
										v-model="inputs['addGenre'].value"
										ref="new-genre"
										placeholder="Add genre..."
										:all-items="autosuggest.allItems.genres"
										@submitted="addTag('genres')"
										@keyup.shift.enter="
											getAlbumData('genres')
										"
									/>
									<button
										v-if="inputs.discogs.value"
										class="button album-get-button"
										@click="getAlbumData('genres')"
									>
										<i
											class="material-icons"
											v-tippy
											content="Fill from Discogs"
											>album</i
										>
									</button>
									<button
										class="button is-info add-button"
										@click="addTag('genres')"
									>
										<i class="material-icons">add</i>
									</button>
								</p>
								<div class="list-container">
									<div
										class="list-item"
										v-for="genre in inputs['genres'].value"
										:key="genre"
									>
										<div
											class="list-item-circle"
											@click="removeTag('genres', genre)"
										>
											<i class="material-icons">close</i>
										</div>
										<p>{{ genre }}</p>
									</div>
								</div>
							</div>
							<div class="tags-container">
								<label class="label">Tags</label>
								<p class="control has-addons">
									<auto-suggest
										v-model="inputs['addTag'].value"
										ref="new-tag"
										placeholder="Add tag..."
										:all-items="autosuggest.allItems.tags"
										@submitted="addTag('tags')"
									/>
									<button
										class="button is-info add-button"
										@click="addTag('tags')"
									>
										<i class="material-icons">add</i>
									</button>
								</p>
								<div class="list-container">
									<div
										class="list-item"
										v-for="tag in inputs['tags'].value"
										:key="tag"
									>
										<div
											class="list-item-circle"
											@click="removeTag('tags', tag)"
										>
											<i class="material-icons">close</i>
										</div>
										<p>{{ tag }}</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div
					class="right-section"
					v-if="songDataLoaded && !songDeleted"
				>
					<div id="tabs-container">
						<div id="tab-selection">
							<button
								class="button is-default"
								:class="{ selected: tab === 'discogs' }"
								:ref="el => (tabs['discogs-tab'] = el)"
								@click="showTab('discogs')"
							>
								Discogs
							</button>
							<button
								v-if="!newSong"
								class="button is-default"
								:class="{ selected: tab === 'reports' }"
								:ref="el => (tabs['reports-tab'] = el)"
								@click="showTab('reports')"
							>
								Reports ({{ reports.length }})
							</button>
							<button
								class="button is-default"
								:class="{ selected: tab === 'youtube' }"
								:ref="el => (tabs['youtube-tab'] = el)"
								@click="showTab('youtube')"
							>
								YouTube
							</button>
							<button
								class="button is-default"
								:class="{ selected: tab === 'musare-songs' }"
								:ref="el => (tabs['musare-songs-tab'] = el)"
								@click="showTab('musare-songs')"
							>
								Songs
							</button>
						</div>
						<discogs
							class="tab"
							v-show="tab === 'discogs'"
							:bulk="bulk"
							:modal-uuid="modalUuid"
							:modal-module-path="modalModulePath"
						/>
						<reports-tab
							v-if="!newSong"
							class="tab"
							v-show="tab === 'reports'"
							:modal-uuid="modalUuid"
							:modal-module-path="modalModulePath"
						/>
						<youtube
							class="tab"
							v-show="tab === 'youtube'"
							:modal-uuid="modalUuid"
							:modal-module-path="modalModulePath"
						/>
						<musare-songs
							class="tab"
							v-show="tab === 'musare-songs'"
							:modal-uuid="modalUuid"
							:modal-module-path="modalModulePath"
						/>
					</div>
				</div>
			</template>
			<template #footer>
				<div v-if="bulk">
					<button class="button is-primary" @click="editNextSong()">
						Next
					</button>
					<button
						class="button is-primary"
						@click="toggleFlag()"
						v-if="mediaSource && !songDeleted"
					>
						{{ currentSongFlagged ? "Unflag" : "Flag" }}
					</button>
				</div>
				<div v-if="!newSong && !songDeleted">
					<save-button
						:ref="el => (saveButtonRefs['saveButton'] = el)"
						@clicked="saveSong('saveButton')"
					/>
					<save-button
						:ref="el => (saveButtonRefs['saveAndCloseButton'] = el)"
						:default-message="
							bulk ? `Save and next` : `Save and close`
						"
						@clicked="saveSong('saveAndCloseButton', true)"
					/>

					<div class="right">
						<button
							v-if="hasPermission('songs.remove')"
							class="button is-danger icon-with-button material-icons"
							@click.prevent="
								openModal({
									modal: 'confirm',
									props: {
										message:
											'Removing this song will remove it from all playlists and cause a ratings recalculation.',
										onCompleted: () => remove(song._id)
									}
								})
							"
							content="Delete Song"
							v-tippy
						>
							delete_forever
						</button>
					</div>
				</div>
				<div v-else-if="newSong">
					<save-button
						:ref="el => (saveButtonRefs['createButton'] = el)"
						default-message="Create Song"
						@clicked="saveSong('createButton')"
					/>
					<save-button
						:ref="
							el => (saveButtonRefs['createAndCloseButton'] = el)
						"
						:default-message="
							bulk ? `Create and next` : `Create and close`
						"
						@clicked="saveSong('createAndCloseButton', true)"
					/>
				</div>
			</template>
		</modal>
		<floating-box
			id="genreHelper"
			ref="genreHelper"
			:column="false"
			title="Song Genres List"
		>
			<template #body>
				<span
					v-for="item in autosuggest.allItems.genres"
					:key="`genre-helper-${item}`"
				>
					{{ item }}
				</span>
			</template>
		</floating-box>
	</div>
</template>

<style lang="less" scoped>
.night-mode {
	.edit-section,
	.player-section,
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

	.left-section {
		.edit-section {
			.album-get-button,
			.duration-fill-button,
			.youtube-get-button,
			.soundcloud-get-button,
			.add-button {
				&:focus,
				&:hover {
					border: none !important;
				}
			}
		}
	}

	.duration-canvas {
		background-color: var(--dark-grey-2) !important;
	}

	.sidebar {
		.sidebar-head,
		.sidebar-foot {
			background-color: var(--dark-grey-3);
			border: none;
		}

		.sidebar-body {
			background-color: var(--dark-grey-4) !important;
		}

		.sidebar-head .toggle-sidebar-icon.material-icons,
		.sidebar-title {
			color: var(--white);
		}

		p,
		label,
		td,
		th {
			color: var(--light-grey-2) !important;
		}

		h1,
		h2,
		h3,
		h4,
		h5,
		h6 {
			color: var(--white) !important;
		}
	}
}

.modal-card-body {
	display: flex;
}

.notice-container {
	display: flex;
	flex: 1;
	justify-content: center;

	h4 {
		margin: auto;
	}
}

.left-section {
	height: 100%;
	display: flex;
	flex-direction: column;
	margin-right: 16px;

	.top-section {
		display: flex;

		.player-section {
			width: 530px;
			display: flex;
			flex-direction: column;
			border: 1px solid var(--light-grey-3);
			border-radius: @border-radius;
			overflow: hidden;

			.youtube-player-wrapper {
				display: flex;

				> * {
					flex: 1;
				}
			}

			.duration-canvas {
				background-color: var(--light-grey-2);
			}

			.player-error,
			.no-media-source-specified-message {
				display: flex;
				height: 318px;
				width: 530px;
				align-items: center;

				* {
					margin: 0;
					flex: 1;
					font-size: 30px;
					text-align: center;
				}
			}

			.player-footer {
				display: flex;
				justify-content: space-between;
				height: 54px;
				padding-left: 10px;
				padding-right: 10px;

				> * {
					width: 33.3%;
					display: flex;
					align-items: center;
				}

				.player-footer-left {
					flex: 1;

					& > .button:not(:first-child) {
						margin-left: 5px;
					}

					:deep(& > .playerRateDropdown) {
						margin-left: 5px;
						margin-bottom: unset !important;

						.control.has-addons {
							margin-bottom: unset !important;

							& > .button {
								font-size: 24px;
							}
						}
					}

					:deep(.tippy-box[data-theme~="dropdown"]) {
						max-width: 100px !important;

						.nav-dropdown-items .nav-item {
							justify-content: center !important;
							border-radius: @border-radius !important;

							&.active {
								background-color: var(--primary-color);
								color: var(--white);
							}
						}
					}
				}

				.player-footer-center {
					justify-content: center;
					align-items: center;
					flex: 2;
					font-size: 18px;
					font-weight: 400;
					width: 200px;
					margin: 0 5px;

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
				}
			}
		}

		:deep(.thumbnail-preview) {
			width: 189px;
			height: 189px;
			margin-left: 16px;
		}

		.thumbnail-dummy {
			opacity: 0;
			height: 10px;
			width: 10px;
		}
	}

	.edit-section {
		display: flex;
		flex-wrap: wrap;
		flex-grow: 1;
		border: 1px solid var(--light-grey-3);
		margin-top: 16px;
		border-radius: @border-radius;

		.album-get-button {
			background-color: var(--purple);
			color: var(--white);
			width: 32px;
			text-align: center;
			border-width: 0;
		}

		.duration-fill-button,
		.youtube-get-button {
			background-color: var(--dark-red);
			color: var(--white);
			width: 32px;
			text-align: center;
			border-width: 0;
		}

		.soundcloud-get-button {
			background-color: var(--orange);
			color: var(--white);
			width: 32px;
			text-align: center;
			border-width: 0;
		}

		.add-button {
			background-color: var(--primary-color) !important;
			width: 32px;

			i {
				font-size: 32px;
			}
		}

		.album-get-button,
		.duration-fill-button,
		.youtube-get-button,
		.add-button {
			&:focus,
			&:hover {
				filter: contrast(0.75);
				border: 1px solid var(--black) !important;
			}
		}

		.youtube-get-button,
		.soundcloud-get-button {
			padding-left: 4px;
			padding-right: 4px;

			.youtube-icon,
			.soundcloud-icon {
				background: var(--white);
			}
		}

		> div {
			margin: 16px !important;
			width: 100%;
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
			margin-right: 16px;
			width: 100%;
		}

		.youtube-id-container {
			margin-right: 16px;
			width: calc((100% - 16px) / 8 * 3);
		}

		.verified-container {
			width: calc((100% - 16px) / 8);

			.checkbox-control {
				margin-top: 10px;
			}
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
					color: var(--primary-color);
					cursor: pointer;
					-webkit-user-select: none;
					-moz-user-select: none;
					-ms-user-select: none;
					user-select: none;
				}
			}
		}

		.tags-container {
			width: calc((100% - 32px) / 3);
			position: relative;
		}

		.list-item-circle {
			background-color: var(--primary-color);
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
				color: var(--primary-color);
				font-size: 14px;
				margin-left: 1px;
				position: relative;
				top: -1px;
			}
		}

		.list-item-circle:hover,
		.list-item-circle:focus {
			i {
				color: var(--white);
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

		.thumbnail-warning {
			color: var(--red);
			font-size: 18px;
			margin: auto 0 auto 5px;
		}
	}
}

.right-section {
	flex-basis: unset !important;
	flex-grow: 0 !important;
	display: flex;
	height: 100%;

	#tabs-container {
		width: 376px;

		#tab-selection {
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
}

@media screen and (max-width: 1100px) {
	.left-section,
	.right-section {
		height: unset;
		max-height: unset;
	}

	.left-section {
		margin-right: 0;
	}

	.right-section {
		flex-basis: 100% !important;

		#tabs-container {
			width: 100%;
		}
	}
}

.modal-card-foot .is-primary {
	width: 200px;
}

:deep(.autosuggest-container) {
	top: unset;
}

.toggle-sidebar-icon {
	display: none;
}

.sidebar {
	width: 100%;
	max-width: 350px;
	z-index: 2000;
	display: flex;
	flex-direction: column;
	position: relative;
	height: 100%;
	max-height: calc(100vh - 40px);
	overflow: auto;
	margin-right: 8px;
	border-radius: @border-radius;

	.sidebar-head,
	.sidebar-foot {
		display: flex;
		flex-shrink: 0;
		position: relative;
		justify-content: flex-start;
		align-items: center;
		padding: 20px;
		background-color: var(--light-grey);
	}

	.sidebar-head {
		border-bottom: 1px solid var(--light-grey-2);
		border-radius: @border-radius @border-radius 0 0;

		.sidebar-title {
			display: flex;
			flex: 1;
			margin: 0;
			font-size: 26px;
			font-weight: 600;
		}
	}

	.sidebar-body {
		background-color: var(--white);
		display: flex;
		flex-direction: column;
		row-gap: 8px;
		flex: 1;
		overflow: auto;
		padding: 10px;

		.edit-songs-items {
			display: flex;
			flex-direction: column;
			row-gap: 8px;

			.item {
				display: flex;
				flex-direction: row;
				align-items: center;
				column-gap: 8px;

				:deep(.song-item) {
					.item-icon {
						margin-right: 10px;
						cursor: pointer;
					}

					.removed-icon,
					.error-icon {
						color: var(--red);
					}

					.saving-icon,
					.todo-icon,
					.editing-icon {
						color: var(--primary-color);
					}

					.done-icon {
						color: var(--green);
					}

					.flag-icon {
						color: var(--orange);

						&.flagged {
							color: var(--grey);
						}
					}

					&.removed {
						filter: grayscale(100%);
						cursor: not-allowed;
						user-select: none;
					}
				}
			}
		}

		.no-items {
			text-align: center;
			font-size: 18px;
		}
	}

	.sidebar-foot {
		border-top: 1px solid var(--light-grey-2);
		border-radius: 0 0 @border-radius @border-radius;

		.button {
			flex: 1;
		}
	}

	.sidebar-overlay {
		display: none;
	}
}

@media only screen and (max-width: 1580px) {
	.toggle-sidebar-icon {
		display: flex;
		margin-right: 5px;
		transform: rotate(90deg);
		cursor: pointer;
	}

	.sidebar {
		display: none;

		&.active {
			display: flex;
			position: absolute;
			z-index: 2010;
			top: 20px;
			left: 20px;

			.sidebar-head .toggle-sidebar-icon {
				display: flex;
				margin-left: 5px;
				transform: rotate(-90deg);
			}
		}
	}

	.sidebar-overlay {
		display: flex;
		position: absolute;
		z-index: 2009;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(10, 10, 10, 0.85);
	}
}
</style>
