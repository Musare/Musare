import { ref } from "vue";

type Player = {
	error: boolean;
	errorMessage: string;
	player: any;
	paused: boolean;
	playerReady: boolean;
	autoPlayed: boolean;
	duration: string;
	currentTime: number;
	playbackRate: number;
	videoNote: string;
	volume: number;
	muted: boolean;
	showRateDropdown: boolean;
};

export const useYoutubePlayer = () => {
	const player = ref<Player>({
		error: false,
		errorMessage: "",
		player: null,
		paused: true,
		playerReady: false,
		autoPlayed: false,
		duration: "0.000",
		currentTime: 0,
		playbackRate: 1,
		videoNote: "",
		volume: 0,
		muted: false,
		showRateDropdown: false
	});

	const updatePlayer = _player => {
		player.value = Object.assign(player.value, _player);
	};

	const loadVideoById = id => {
		player.value.player.loadVideoById(id);
	};

	const playVideo = () => {
		if (player.value.player && player.value.player.playVideo) {
			player.value.player.playVideo();
		}
		player.value.paused = false;
	};

	const pauseVideo = () => {
		if (player.value.player && player.value.player.pauseVideo) {
			player.value.player.pauseVideo();
		}
		player.value.paused = true;
	};

	const stopVideo = () => {
		if (player.value.player && player.value.player.pauseVideo) {
			player.value.player.pauseVideo();
			player.value.player.seekTo(0);
		}
	};

	const setPlaybackRate = (rate?: number) => {
		if (typeof rate === "number") {
			player.value.playbackRate = rate;
			player.value.player.setPlaybackRate(rate);
		} else if (
			player.value.player.getPlaybackRate() !== undefined &&
			player.value.playbackRate !== player.value.player.getPlaybackRate()
		) {
			player.value.player.setPlaybackRate(player.value.playbackRate);
			player.value.playbackRate = player.value.player.getPlaybackRate();
		}
	};

	return {
		player,
		updatePlayer,
		loadVideoById,
		playVideo,
		pauseVideo,
		stopVideo,
		setPlaybackRate
	};
};
