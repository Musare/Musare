import { ref } from "vue";
import Toast from "toasters";
import { AddSongToPlaylistResponse } from "@musare_types/actions/PlaylistsActions";
import { useWebsocketsStore } from "@/stores/websockets";

const youtubeVideoUrlRegex =
	/^(?:https?:\/\/)?(?:www\.)?(m\.)?(?:music\.)?(?:youtube\.com|youtu\.be)\/(?:watch\/?\?v=)?(?:.*&v=)?(?<youtubeId>[\w-]{11}).*$/;
const youtubeVideoIdRegex = /^(?<youtubeId>[\w-]{11})$/;

export const useYoutubeDirect = () => {
	const youtubeDirect = ref("");

	const { socket } = useWebsocketsStore();

	const getYoutubeVideoId = () => {
		const inputValue = youtubeDirect.value.trim();

		// Check if the user simply used a YouTube ID in the input directly
		const youtubeVideoIdMatch = youtubeVideoIdRegex.exec(inputValue);
		if (youtubeVideoIdMatch && youtubeVideoIdMatch.groups.youtubeId) {
			// eslint-disable-next-line prefer-destructuring
			return youtubeVideoIdMatch.groups.youtubeId;
		}

		// Check if we can get the video ID from passing in the input value into the URL regex
		const youtubeVideoUrlMatch = youtubeVideoUrlRegex.exec(inputValue);
		if (youtubeVideoUrlMatch && youtubeVideoUrlMatch.groups.youtubeId) {
			// eslint-disable-next-line prefer-destructuring
			return youtubeVideoUrlMatch.groups.youtubeId;
		}

		// Check if the user provided a URL of some kind that has the query parameter v, which also passes the YouTube video ID regex
		try {
			const { searchParams } = new URL(inputValue);
			if (searchParams.has("v")) {
				const vValue = searchParams.get("v");
				const vValueMatch = youtubeVideoIdRegex.exec(vValue);
				if (vValueMatch && vValueMatch.groups.youtubeId) {
					// eslint-disable-next-line prefer-destructuring
					return youtubeVideoIdMatch.groups.youtubeId;
				}
			}
		} catch {
			return null;
		}

		return null;
	};

	const addToPlaylist = (playlistId: string) => {
		const youtubeVideoId = getYoutubeVideoId();

		if (!youtubeVideoId)
			new Toast(
				`Could not determine the YouTube video id from the provided URL.`
			);
		else {
			socket.dispatch(
				"playlists.addSongToPlaylist",
				false,
				`youtube:${youtubeVideoId}`,
				playlistId,
				(res: AddSongToPlaylistResponse) => {
					if (res.status !== "success")
						new Toast(`Error: ${res.message}`);
					else {
						new Toast(res.message);
						youtubeDirect.value = "";
					}
				}
			);
		}
	};

	const addToQueue = (stationId: string) => {
		const youtubeVideoId = getYoutubeVideoId();

		if (!youtubeVideoId)
			new Toast(
				`Could not determine the YouTube video id from the provided URL.`
			);
		else {
			socket.dispatch(
				"stations.addToQueue",
				stationId,
				`youtube:${youtubeVideoId}`,
				"manual",
				res => {
					if (res.status !== "success")
						new Toast(`Error: ${res.message}`);
					else {
						new Toast(res.message);
						youtubeDirect.value = "";
					}
				}
			);
		}
	};

	return {
		youtubeDirect,
		addToPlaylist,
		addToQueue,
		getYoutubeVideoId
	};
};
