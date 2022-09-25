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

import { Song } from "@/types/song.js";

import { useWebsocketsStore } from "@/stores/websockets";
import { useModalsStore } from "@/stores/modals";
import { useEditSongStore } from "@/stores/editSong";
import { useStationStore } from "@/stores/station";
import { useUserAuthStore } from "@/stores/userAuth";

import Modal from "@/components/Modal.vue";

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
	modalUuid: { type: String, default: "" },
	modalModulePath: {
		type: String,
		default: "modals/editSong/MODAL_UUID"
	},
	discogsAlbum: { type: Object, default: null }
});

const editSongStore = useEditSongStore(props);
const stationStore = useStationStore();
const { socket } = useWebsocketsStore();
const userAuthStore = useUserAuthStore();

const { openModal, closeCurrentModal, preventCloseCbs } = useModalsStore();
const { hasPermission } = userAuthStore;

const {
	tab,
	video,
	song,
	youtubeId,
	prefillData,
	originalSong,
	reports,
	newSong,
	bulk,
	youtubeIds,
	songPrefillData
} = storeToRefs(editSongStore);

const songDataLoaded = ref(false);
const songDeleted = ref(false);
const youtubeError = ref(false);
const youtubeErrorMessage = ref("");
const youtubeVideoDuration = ref("0.000");
const youtubeVideoCurrentTime = ref(<number | string>0);
const youtubeVideoNote = ref("");
const useHTTPS = ref(false);
const muted = ref(false);
const volumeSliderValue = ref(0);
const artistInputValue = ref("");
const genreInputValue = ref("");
const tagInputValue = ref("");
const activityWatchVideoDataInterval = ref(null);
const activityWatchVideoLastStatus = ref("");
const activityWatchVideoLastStartDuration = ref(0);
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
const inputs = ref([]);
const playerReady = ref(true);
const interval = ref();
const saveButtonRefs = ref(<any>[]);
const canvasElement = ref();
const genreHelper = ref();
// EditSongs
const items = ref([]);
const currentSong = ref(<Song>{});
const flagFilter = ref(false);
const sidebarMobileActive = ref(false);
const songItems = ref([]);
// EditSongs end

const isYoutubeThumbnail = computed(
	() =>
		songDataLoaded.value &&
		song.value.youtubeId &&
		song.value.thumbnail &&
		(song.value.thumbnail.lastIndexOf("i.ytimg.com") !== -1 ||
			song.value.thumbnail.lastIndexOf("img.youtube.com") !== -1)
);
// EditSongs
const editingItemIndex = computed(() =>
	items.value.findIndex(
		item => item.song.youtubeId === currentSong.value.youtubeId
	)
);
const filteredItems = computed({
	get: () =>
		items.value.filter(item => (flagFilter.value ? item.flagged : true)),
	set: (newItem: any) => {
		const index = items.value.findIndex(
			item => item.song.youtubeId === newItem.youtubeId
		);
		items.value[index] = newItem;
	}
});
const filteredEditingItemIndex = computed(() =>
	filteredItems.value.findIndex(
		item => item.song.youtubeId === currentSong.value.youtubeId
	)
);
const currentSongFlagged = computed(
	() =>
		items.value.find(
			item => item.song.youtubeId === currentSong.value.youtubeId
		)?.flagged
);
// EditSongs end

const {
	editSong,
	stopVideo,
	hardStopVideo,
	loadVideoById,
	pauseVideo,
	setSong,
	resetSong,
	updateOriginalSong,
	updateSongField,
	updateReports,
	setPlaybackRate
} = editSongStore;

const { updateMediaModalPlayingAudio } = stationStore;

const showTab = payload => {
	if (tabs.value[`${payload}-tab`])
		tabs.value[`${payload}-tab`].scrollIntoView({ block: "nearest" });
	editSongStore.showTab(payload);
};

// EditSongs
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

const pickSong = song => {
	editSong({
		youtubeId: song.youtubeId,
		prefill: songPrefillData.value[song.youtubeId]
	});
	currentSong.value = song;
	if (songItems.value[`edit-songs-item-${song.youtubeId}`])
		songItems.value[`edit-songs-item-${song.youtubeId}`].scrollIntoView();
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

const onSavedSuccess = youtubeId => {
	const itemIndex = items.value.findIndex(
		item => item.song.youtubeId === youtubeId
	);
	if (itemIndex > -1) {
		items.value[itemIndex].status = "done";
		items.value[itemIndex].flagged = false;
	}
};

const onSavedError = youtubeId => {
	const itemIndex = items.value.findIndex(
		item => item.song.youtubeId === youtubeId
	);
	if (itemIndex > -1) items.value[itemIndex].status = "error";
};

const onSaving = youtubeId => {
	const itemIndex = items.value.findIndex(
		item => item.song.youtubeId === youtubeId
	);
	if (itemIndex > -1) items.value[itemIndex].status = "saving";
};
// EditSongs end

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

const unloadSong = (_youtubeId, songId?) => {
	songDataLoaded.value = false;
	songDeleted.value = false;
	stopVideo();
	pauseVideo(true);

	resetSong(_youtubeId);
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

const loadSong = _youtubeId => {
	console.log(`LOAD SONG ${_youtubeId}`);
	songNotFound.value = false;
	socket.dispatch(`songs.getSongsFromYoutubeIds`, [_youtubeId], res => {
		const { songs } = res.data;
		if (res.status === "success" && songs.length > 0) {
			let _song = songs[0];
			_song = Object.assign(_song, prefillData.value);

			setSong(_song);

			songDataLoaded.value = true;

			if (_song._id) {
				socket.dispatch("apis.joinRoom", `edit-song.${_song._id}`);

				if (!newSong.value)
					socket.dispatch(
						"reports.getReportsForSong",
						_song._id,
						res => {
							console.log(222, res);
							updateReports(res.data.reports);
						}
					);
			}

			if (video.value.player && video.value.player.cueVideoById) {
				video.value.player.cueVideoById(_youtubeId, _song.skipDuration);
			}
		} else {
			new Toast("Song with that ID not found");
			if (bulk.value) songNotFound.value = true;
			if (!bulk.value) closeCurrentModal();
		}
	});
};

const drawCanvas = () => {
	if (!songDataLoaded.value || !canvasElement.value) return;
	const ctx = canvasElement.value.getContext("2d");

	const videoDuration = Number(youtubeVideoDuration.value);

	const skipDuration = Number(song.value.skipDuration);
	const duration = Number(song.value.duration);
	const afterDuration = videoDuration - (skipDuration + duration);

	const width = 530;

	const currentTime =
		video.value.player && video.value.player.getCurrentTime
			? video.value.player.getCurrentTime()
			: 0;

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

const seekTo = position => {
	pauseVideo(false);

	video.value.player.seekTo(position);
};

const save = (songToCopy, closeOrNext, saveButtonRefName, _newSong = false) => {
	const _song = JSON.parse(JSON.stringify(songToCopy));

	if (!newSong.value || bulk.value) onSaving(_song.youtubeId);

	const saveButtonRef = saveButtonRefs.value[saveButtonRefName];

	if (!youtubeError.value && youtubeVideoDuration.value === "0.000") {
		saveButtonRef.handleFailedSave();
		if (!_newSong) onSavedError(_song.youtubeId);
		return new Toast("The video appears to not be working.");
	}

	if (!_song.title) {
		saveButtonRef.handleFailedSave();
		if (!_newSong || bulk.value) onSavedError(_song.youtubeId);
		return new Toast("Please fill in all fields");
	}

	if (!_song.thumbnail) {
		saveButtonRef.handleFailedSave();
		if (!_newSong || bulk.value) onSavedError(_song.youtubeId);
		return new Toast("Please fill in all fields");
	}

	// const thumbnailHeight = thumbnailElement.value.naturalHeight;
	// const thumbnailWidth = thumbnailElement.value.naturalWidth;

	// if (thumbnailHeight < 80 || thumbnailWidth < 80) {
	// 	saveButtonRef.handleFailedSave();
	// 	return new Toast(
	// 		"Thumbnail width and height must be at least 80px."
	// 	);
	// }

	// if (thumbnailHeight > 4000 || thumbnailWidth > 4000) {
	// 	saveButtonRef.handleFailedSave();
	// 	return new Toast(
	// 		"Thumbnail width and height must be less than 4000px."
	// 	);
	// }

	// if (thumbnailHeight - thumbnailWidth > 5) {
	// 	saveButtonRef.handleFailedSave();
	// 	return new Toast("Thumbnail cannot be taller than it is wide.");
	// }

	// Youtube Id
	if (
		!_newSong &&
		youtubeError.value &&
		originalSong.value.youtubeId !== _song.youtubeId
	) {
		saveButtonRef.handleFailedSave();
		if (!_newSong || bulk.value) onSavedError(_song.youtubeId);
		return new Toast(
			"You're not allowed to change the YouTube id while the player is not working"
		);
	}

	// Duration
	if (
		Number(_song.skipDuration) + Number(_song.duration) >
			Number.parseInt(youtubeVideoDuration.value) &&
		(((!_newSong || bulk.value) && !youtubeError.value) ||
			originalSong.value.duration !== _song.duration)
	) {
		saveButtonRef.handleFailedSave();
		if (!_newSong || bulk.value) onSavedError(_song.youtubeId);
		return new Toast(
			"Duration can't be higher than the length of the video"
		);
	}

	// Title
	if (!validation.isLength(_song.title, 1, 100)) {
		saveButtonRef.handleFailedSave();
		if (!_newSong || bulk.value) onSavedError(_song.youtubeId);
		return new Toast("Title must have between 1 and 100 characters.");
	}

	// Artists
	if (
		(_song.verified && _song.artists.length < 1) ||
		_song.artists.length > 10
	) {
		saveButtonRef.handleFailedSave();
		if (!_newSong || bulk.value) onSavedError(_song.youtubeId);
		return new Toast(
			"Invalid artists. You must have at least 1 artist and a maximum of 10 artists."
		);
	}

	let error;
	_song.artists.forEach(artist => {
		if (!validation.isLength(artist, 1, 64)) {
			error = "Artist must have between 1 and 64 characters.";
			return error;
		}
		if (artist === "NONE") {
			error =
				'Invalid artist format. Artists are not allowed to be named "NONE".';
			return error;
		}

		return false;
	});

	if (error) {
		saveButtonRef.handleFailedSave();
		if (!_newSong || bulk.value) onSavedError(_song.youtubeId);
		return new Toast(error);
	}

	// Genres
	error = undefined;
	if (_song.verified && _song.genres.length < 1)
		_song.genres.forEach(genre => {
			if (!validation.isLength(genre, 1, 32)) {
				error = "Genre must have between 1 and 32 characters.";
				return error;
			}
			if (!validation.regex.ascii.test(genre)) {
				error =
					"Invalid genre format. Only ascii characters are allowed.";
				return error;
			}

			return false;
		});

	if ((_song.verified && _song.genres.length < 1) || _song.genres.length > 16)
		error = "You must have between 1 and 16 genres.";

	if (error) {
		saveButtonRef.handleFailedSave();
		if (!_newSong || bulk.value) onSavedError(_song.youtubeId);
		return new Toast(error);
	}

	error = undefined;
	_song.tags.forEach(tag => {
		if (
			!/^[a-zA-Z0-9_]{1,64}$|^[a-zA-Z0-9_]{1,64}\[[a-zA-Z0-9_]{1,64}\]$/.test(
				tag
			)
		) {
			error = "Invalid tag format.";
			return error;
		}

		return false;
	});

	if (error) {
		saveButtonRef.handleFailedSave();
		if (!_newSong || bulk.value) onSavedError(_song.youtubeId);
		return new Toast(error);
	}

	// Thumbnail
	if (!validation.isLength(_song.thumbnail, 1, 256)) {
		saveButtonRef.handleFailedSave();
		if (!_newSong || bulk.value) onSavedError(_song.youtubeId);
		return new Toast("Thumbnail must have between 8 and 256 characters.");
	}
	if (useHTTPS.value && _song.thumbnail.indexOf("https://") !== 0) {
		saveButtonRef.handleFailedSave();
		if (!_newSong || bulk.value) onSavedError(_song.youtubeId);
		return new Toast('Thumbnail must start with "https://".');
	}

	if (
		!useHTTPS.value &&
		_song.thumbnail.indexOf("http://") !== 0 &&
		_song.thumbnail.indexOf("https://") !== 0
	) {
		saveButtonRef.handleFailedSave();
		if (!_newSong || bulk.value) onSavedError(_song.youtubeId);
		return new Toast('Thumbnail must start with "http://".');
	}

	saveButtonRef.status = "saving";

	if (_newSong)
		return socket.dispatch(`songs.create`, _song, res => {
			new Toast(res.message);

			if (res.status === "error") {
				saveButtonRef.handleFailedSave();
				onSavedError(_song.youtubeId);
				return;
			}

			saveButtonRef.handleSuccessfulSave();
			onSavedSuccess(_song.youtubeId);

			if (!closeOrNext) {
				loadSong(_song.youtubeId);
				return;
			}

			if (bulk.value) editNextSong();
			else closeCurrentModal();
		});
	return socket.dispatch(`songs.update`, _song._id, _song, res => {
		new Toast(res.message);

		if (res.status === "error") {
			saveButtonRef.handleFailedSave();
			onSavedError(_song.youtubeId);
			return;
		}

		updateOriginalSong(_song);

		saveButtonRef.handleSuccessfulSave();
		onSavedSuccess(_song.youtubeId);

		if (!closeOrNext) return;

		if (bulk.value) editNextSong();
		else closeCurrentModal();
	});
};

const getAlbumData = type => {
	if (!song.value.discogs) return;
	if (type === "title")
		updateSongField({
			field: "title",
			value: song.value.discogs.track.title
		});
	if (type === "albumArt")
		updateSongField({
			field: "thumbnail",
			value: song.value.discogs.album.albumArt
		});
	if (type === "genres")
		updateSongField({
			field: "genres",
			value: JSON.parse(JSON.stringify(song.value.discogs.album.genres))
		});
	if (type === "artists")
		updateSongField({
			field: "artists",
			value: JSON.parse(JSON.stringify(song.value.discogs.album.artists))
		});
};

const getYouTubeData = type => {
	if (type === "title") {
		try {
			const { title } = video.value.player.getVideoData();

			if (title)
				updateSongField({
					field: "title",
					value: title
				});
			else throw new Error("No title found");
		} catch (e) {
			new Toast(
				"Unable to fetch YouTube video title. Try starting the video."
			);
		}
	}
	if (type === "thumbnail")
		updateSongField({
			field: "thumbnail",
			value: `https://img.youtube.com/vi/${song.value.youtubeId}/mqdefault.jpg`
		});
	if (type === "author") {
		try {
			const { author } = video.value.player.getVideoData();

			if (author) artistInputValue.value = author;
			else throw new Error("No video author found");
		} catch (e) {
			new Toast(
				"Unable to fetch YouTube video author. Try starting the video."
			);
		}
	}
};

const fillDuration = () => {
	song.value.duration =
		Number.parseInt(youtubeVideoDuration.value) - song.value.skipDuration;
};

const settings = type => {
	switch (type) {
		case "stop":
			stopVideo();
			pauseVideo(true);

			break;
		case "hardStop":
			hardStopVideo();
			pauseVideo(true);

			break;
		case "pause":
			pauseVideo(true);

			break;
		case "play":
			pauseVideo(false);

			break;
		case "skipToLast10Secs":
			seekTo(song.value.duration - 10 + song.value.skipDuration);
			break;
		default:
			break;
	}
};

const play = () => {
	if (video.value.player.getVideoData().video_id !== song.value.youtubeId) {
		song.value.duration = -1;
		loadVideoById(song.value.youtubeId, song.value.skipDuration);
	}
	settings("play");
};

const changeVolume = () => {
	const volume = volumeSliderValue.value;
	localStorage.setItem("volume", `${volume}`);
	video.value.player.setVolume(volume);
	if (volume > 0) {
		video.value.player.unMute();
		muted.value = false;
	}
};

const toggleMute = () => {
	const previousVolume = parseFloat(localStorage.getItem("volume"));
	const volume = video.value.player.getVolume() <= 0 ? previousVolume : 0;
	muted.value = !muted.value;
	volumeSliderValue.value = volume;
	video.value.player.setVolume(volume);
	if (!muted.value) localStorage.setItem("volume", `${volume}`);
};

const addTag = (type, value?) => {
	if (type === "genres") {
		const genre = value || genreInputValue.value.trim();

		if (
			song.value.genres
				.map(genre => genre.toLowerCase())
				.indexOf(genre.toLowerCase()) !== -1
		)
			return new Toast("Genre already exists");
		if (genre) {
			song.value.genres.push(genre);
			genreInputValue.value = "";
			return false;
		}

		return new Toast("Genre cannot be empty");
	}
	if (type === "artists") {
		const artist = value || artistInputValue.value;
		if (song.value.artists.indexOf(artist) !== -1)
			return new Toast("Artist already exists");
		if (artist !== "") {
			song.value.artists.push(artist);
			artistInputValue.value = "";
			return false;
		}
		return new Toast("Artist cannot be empty");
	}
	if (type === "tags") {
		const tag = value || tagInputValue.value;
		if (song.value.tags.indexOf(tag) !== -1)
			return new Toast("Tag already exists");
		if (tag !== "") {
			song.value.tags.push(tag);
			tagInputValue.value = "";
			return false;
		}
		return new Toast("Tag cannot be empty");
	}

	return false;
};

const removeTag = (type, value) => {
	if (type === "genres")
		song.value.genres.splice(song.value.genres.indexOf(value), 1);
	else if (type === "artists")
		song.value.artists.splice(song.value.artists.indexOf(value), 1);
	else if (type === "tags")
		song.value.tags.splice(song.value.tags.indexOf(value), 1);
};

const setTrackPosition = event => {
	seekTo(
		Number(
			Number(video.value.player.getDuration()) *
				((event.pageX - event.target.getBoundingClientRect().left) /
					530)
		)
	);
};

const toggleGenreHelper = () => {
	genreHelper.value.toggleBox();
};

const resetGenreHelper = () => {
	genreHelper.value.resetBox();
};

const sendActivityWatchVideoData = () => {
	if (!video.value.paused) {
		if (activityWatchVideoLastStatus.value !== "playing") {
			activityWatchVideoLastStatus.value = "playing";
			if (
				song.value.skipDuration > 0 &&
				Number(youtubeVideoCurrentTime.value) === 0
			) {
				activityWatchVideoLastStartDuration.value = Math.floor(
					song.value.skipDuration +
						Number(youtubeVideoCurrentTime.value)
				);
			} else {
				activityWatchVideoLastStartDuration.value = Math.floor(
					Number(youtubeVideoCurrentTime.value)
				);
			}
		}

		const videoData = {
			title: song.value.title,
			artists: song.value.artists ? song.value.artists.join(", ") : null,
			youtubeId: song.value.youtubeId,
			muted: muted.value,
			volume: volumeSliderValue.value,
			startedDuration:
				activityWatchVideoLastStartDuration.value <= 0
					? 0
					: activityWatchVideoLastStartDuration.value,
			source: `editSong#${song.value.youtubeId}`,
			hostname: window.location.hostname
		};

		aw.sendVideoData(videoData);
	} else {
		activityWatchVideoLastStatus.value = "not_playing";
	}
};

const remove = id => {
	socket.dispatch("songs.remove", id, res => {
		new Toast(res.message);
	});
};

const handleConfirmed = ({ action, params }) => {
	if (typeof action === "function") {
		if (params) action(params);
		else action();
	}
};

const confirmAction = ({ message, action, params }) => {
	openModal({
		modal: "confirm",
		data: {
			message,
			action,
			params,
			onCompleted: handleConfirmed
		}
	});
};

const onCloseModal = (): Promise<void> =>
	new Promise(resolve => {
		const songStringified = JSON.stringify({
			...song.value,
			...{
				duration: Number(song.value.duration).toFixed(3)
			}
		});
		const originalSongStringified = JSON.stringify({
			...originalSong.value,
			...{
				duration: Number(originalSong.value.duration).toFixed(3)
			}
		});
		const unsavedChanges = songStringified !== originalSongStringified;

		const confirmReasons = [];

		if (unsavedChanges) {
			confirmReasons.push(
				"You have unsaved changes. Are you sure you want to discard unsaved changes?"
			);
		}

		if (bulk.value) {
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
			confirmAction({
				message: confirmReasons,
				action: resolve,
				params: null
			});
		else resolve();
	});

watch(
	() => song.value.duration,
	() => drawCanvas()
);
watch(
	() => song.value.skipDuration,
	() => drawCanvas()
);
watch(youtubeId, (_youtubeId, _oldYoutubeId) => {
	console.log("NEW YOUTUBE ID", _youtubeId);
	if (_oldYoutubeId) unloadSong(_oldYoutubeId);
	if (_youtubeId) loadSong(_youtubeId);
});
watch(
	() => hasPermission("songs.update"),
	value => {
		if (!value) closeCurrentModal();
	}
);

onMounted(async () => {
	preventCloseCbs[props.modalUuid] = onCloseModal;

	activityWatchVideoDataInterval.value = setInterval(() => {
		sendActivityWatchVideoData();
	}, 1000);

	useHTTPS.value = await lofig.get("cookie.secure");

	socket.onConnect(() => {
		if (newSong.value && !youtubeId.value && !bulk.value) {
			setSong({
				youtubeId: "",
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
		} else if (youtubeId.value) loadSong(youtubeId.value);
		else if (!bulk.value) {
			new Toast("You can't open EditSong without editing a song");
			return closeCurrentModal();
		}

		interval.value = setInterval(() => {
			if (
				song.value.duration !== -1 &&
				video.value.paused === false &&
				playerReady.value &&
				(video.value.player.getCurrentTime() - song.value.skipDuration >
					song.value.duration ||
					(video.value.player.getCurrentTime() > 0 &&
						video.value.player.getCurrentTime() >=
							video.value.player.getDuration()))
			) {
				stopVideo();
				pauseVideo(true);

				drawCanvas();
			}
			if (
				playerReady.value &&
				video.value.player.getVideoData &&
				video.value.player.getVideoData() &&
				video.value.player.getVideoData().video_id ===
					song.value.youtubeId
			) {
				const currentTime = video.value.player.getCurrentTime();

				if (currentTime !== undefined)
					youtubeVideoCurrentTime.value = currentTime.toFixed(3);

				if (youtubeVideoDuration.value.indexOf(".000") !== -1) {
					const duration = video.value.player.getDuration();

					if (duration !== undefined) {
						if (
							`${youtubeVideoDuration.value}` ===
							`${Number(song.value.duration).toFixed(3)}`
						)
							song.value.duration = duration.toFixed(3);

						youtubeVideoDuration.value = duration.toFixed(3);
						if (youtubeVideoDuration.value.indexOf(".000") !== -1)
							youtubeVideoNote.value = "(~)";
						else youtubeVideoNote.value = "";

						drawCanvas();
					}
				}
			}

			if (video.value.paused === false) drawCanvas();
		}, 200);

		if (window.YT && window.YT.Player) {
			video.value.player = new window.YT.Player(
				`editSongPlayer-${props.modalUuid}`,
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
					startSeconds: song.value.skipDuration,
					events: {
						onReady: () => {
							let volume = parseFloat(
								localStorage.getItem("volume")
							);
							volume = typeof volume === "number" ? volume : 20;
							video.value.player.setVolume(volume);
							if (volume > 0) video.value.player.unMute();

							playerReady.value = true;

							if (song.value && song.value.youtubeId)
								video.value.player.cueVideoById(
									song.value.youtubeId,
									song.value.skipDuration
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
										song.value.duration
									);
									const songDurationNumber2 =
										Number(song.value.duration) + 1;
									const songDurationNumber3 =
										Number(song.value.duration) - 1;
									const fixedSongDuration =
										songDurationNumber.toFixed(3);
									const fixedSongDuration2 =
										songDurationNumber2.toFixed(3);
									const fixedSongDuration3 =
										songDurationNumber3.toFixed(3);

									if (
										`${youtubeVideoDuration.value}` ===
											`${Number(
												song.value.duration
											).toFixed(3)}` &&
										(fixedSongDuration ===
											youtubeVideoDuration.value ||
											fixedSongDuration2 ===
												youtubeVideoDuration.value ||
											fixedSongDuration3 ===
												youtubeVideoDuration.value)
									)
										song.value.duration =
											newYoutubeVideoDuration;

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

								if (song.value.duration === -1)
									song.value.duration = Number.parseInt(
										youtubeVideoDuration.value
									);

								youtubeDuration -= song.value.skipDuration;
								if (song.value.duration > youtubeDuration + 1) {
									stopVideo();
									pauseVideo(true);

									return new Toast(
										"Video can't play. Specified duration is bigger than the YouTube song duration."
									);
								}
								if (song.value.duration <= 0) {
									stopVideo();
									pauseVideo(true);

									return new Toast(
										"Video can't play. Specified duration has to be more than 0 seconds."
									);
								}

								if (
									video.value.player.getCurrentTime() <
									song.value.skipDuration
								) {
									return seekTo(song.value.skipDuration);
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

		socket.on(
			"event:admin.song.removed",
			res => {
				if (res.data.songId === song.value._id) {
					songDeleted.value = true;
				}
			},
			{ modalUuid: props.modalUuid }
		);

		if (bulk.value) {
			socket.dispatch("apis.joinRoom", "edit-songs");

			socket.dispatch(
				"songs.getSongsFromYoutubeIds",
				youtubeIds.value,
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

			socket.on(
				`event:admin.song.created`,
				res => {
					const index = items.value
						.map(item => item.song.youtubeId)
						.indexOf(res.data.song.youtubeId);
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
				`event:admin.song.updated`,
				res => {
					const index = items.value
						.map(item => item.song.youtubeId)
						.indexOf(res.data.song.youtubeId);
					if (index >= 0)
						items.value[index].song = {
							...items.value[index].song,
							...res.data.song,
							updated: true
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

		return null;
	});

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
			save(song.value, false, "saveButton");
		}
	});

	keyboardShortcuts.registerShortcut("editSong.saveClose", {
		keyCode: 83,
		ctrl: true,
		alt: true,
		preventDefault: true,
		handler: () => {
			save(song.value, true, "saveAndCloseButton");
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
});

onBeforeUnmount(() => {
	if (bulk.value) {
		socket.dispatch("apis.leaveRoom", "edit-songs");
	}

	unloadSong(youtubeId.value, song.value._id);

	updateMediaModalPlayingAudio(false);

	playerReady.value = false;
	clearInterval(interval.value);
	clearInterval(activityWatchVideoDataInterval.value);

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
											`edit-songs-item-${data.song.youtubeId}`
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
												currentSong.youtubeId ===
													data.song.youtubeId &&
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
				<div v-if="!youtubeId && !newSong" class="notice-container">
					<h4>No song has been selected</h4>
				</div>
				<div v-if="songDeleted" class="notice-container">
					<h4>The song you were editing has been deleted</h4>
				</div>
				<div
					v-if="
						youtubeId &&
						!songDataLoaded &&
						!songNotFound &&
						!newSong
					"
					class="notice-container"
				>
					<h4>Song hasn't loaded yet</h4>
				</div>
				<div
					v-if="youtubeId && songNotFound && !newSong"
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
							<div :id="`editSongPlayer-${modalUuid}`" />

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
							:song="song"
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
							:src="song.thumbnail"
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
										:ref="
											el => (inputs['title-input'] = el)
										"
										v-model="song.title"
										placeholder="Enter song title..."
										@keyup.shift.enter="
											getAlbumData('title')
										"
									/>
									<button
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
										v-model.number="song.duration"
										@keyup.shift.enter="fillDuration()"
									/>
									<button
										class="button duration-fill-button"
										@click="fillDuration()"
									>
										<i
											class="material-icons"
											v-tippy
											content="Sync duration with YouTube"
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
										v-model.number="song.skipDuration"
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
										v-model="song.thumbnail"
										placeholder="Enter link to thumbnail..."
										@keyup.shift.enter="
											getAlbumData('albumArt')
										"
									/>
									<button
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
								<label class="label">YouTube ID</label>
								<p class="control">
									<input
										class="input"
										type="text"
										placeholder="Enter YouTube ID..."
										v-model="song.youtubeId"
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
											v-model="song.verified"
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
										v-model="artistInputValue"
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
										v-for="artist in song.artists"
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
										v-model="genreInputValue"
										ref="new-genre"
										placeholder="Add genre..."
										:all-items="autosuggest.allItems.genres"
										@submitted="addTag('genres')"
										@keyup.shift.enter="
											getAlbumData('genres')
										"
									/>
									<button
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
										v-for="genre in song.genres"
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
										v-model="tagInputValue"
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
										v-for="tag in song.tags"
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
						v-if="youtubeId && !songDeleted"
					>
						{{ currentSongFlagged ? "Unflag" : "Flag" }}
					</button>
				</div>
				<div v-if="!newSong && !songDeleted">
					<save-button
						:ref="el => (saveButtonRefs['saveButton'] = el)"
						@clicked="save(song, false, 'saveButton')"
					/>
					<save-button
						:ref="el => (saveButtonRefs['saveAndCloseButton'] = el)"
						:default-message="
							bulk ? `Save and next` : `Save and close`
						"
						@clicked="save(song, true, 'saveAndCloseButton')"
					/>

					<div class="right">
						<button
							v-if="hasPermission('songs.remove')"
							class="button is-danger icon-with-button material-icons"
							@click.prevent="
								confirmAction({
									message:
										'Removing this song will remove it from all playlists and cause a ratings recalculation.',
									action: remove,
									params: song._id
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
						@clicked="save(song, false, 'createButton', true)"
					/>
					<save-button
						:ref="
							el => (saveButtonRefs['createAndCloseButton'] = el)
						"
						:default-message="
							bulk ? `Create and next` : `Create and close`
						"
						@clicked="
							save(song, true, 'createAndCloseButton', true)
						"
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

			.duration-canvas {
				background-color: var(--light-grey-2);
			}

			.player-error {
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

		.youtube-get-button {
			padding-left: 4px;
			padding-right: 4px;

			.youtube-icon {
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
